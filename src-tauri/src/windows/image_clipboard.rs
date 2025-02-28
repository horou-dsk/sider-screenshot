// use std::ops::Range;

// use image::{DynamicImage, GenericImageView};

// pub fn gen_from_img(img: &DynamicImage) -> Vec<u8> {
//     //Flipping image, because scan lines are stored bottom to top
//     // let img = img.flipv();

//     //Getting the header
//     let mut byte_vec = Vec::with_capacity((img.width() * img.height() * 4) as usize); // get_header(img.width(), img.height());

//     for (_, _, pixel) in img.pixels() {
//         //Setting the pixels, one by one

//         let pixel_bytes = pixel.0;
//         //One pixel is 4 bytes, BGR and unused
//         byte_vec.push(pixel_bytes[0]);
//         byte_vec.push(pixel_bytes[1]);
//         byte_vec.push(pixel_bytes[2]);
//         byte_vec.push(pixel_bytes[3]); //This is unused based on the specifications
//     }

//     byte_vec
// }

// /// Generates the header for the bitmap from the width and height of the image.
// /// [Resources][http://www.ece.ualberta.ca/~elliott/ee552/studentAppNotes/2003_w/misc/bmp_file_format/bmp_file_format.htm].
// fn get_header(width: u32, height: u32) -> Vec<u8> {
//     //Generating the 54 bytes long vector
//     let mut vec = vec![0; 54];

//     //BM, as written in specifications
//     vec[0] = 66;
//     vec[1] = 77;

//     //File size
//     let file_size = width * height * 4 + 54;
//     set_bytes(&mut vec, &file_size.to_le_bytes(), 2..6);

//     //Not used
//     set_bytes(&mut vec, &0_u32.to_le_bytes(), 6..10);

//     //Offset from the beginning of the file to the beginning of the image data
//     let offset = 54_u32;
//     set_bytes(&mut vec, &offset.to_le_bytes(), 10..14);

//     //Size of the second part of the header
//     let header_size = 40_u32;
//     set_bytes(&mut vec, &header_size.to_le_bytes(), 14..18);

//     //Horizontal width
//     let width_bytes = width.to_le_bytes();
//     set_bytes(&mut vec, &width_bytes, 18..22);

//     //Vertical height
//     let height_bytes = height.to_le_bytes();
//     set_bytes(&mut vec, &height_bytes, 22..26);

//     //Number of planes
//     let planes = 1_u16;
//     set_bytes(&mut vec, &planes.to_le_bytes(), 26..28);

//     //Bits per pixel
//     let bits_per_pixel = 32_u16;
//     set_bytes(&mut vec, &bits_per_pixel.to_le_bytes(), 28..30);

//     //Compression type, 0=no compression
//     let compression_type = 0_u32;
//     set_bytes(&mut vec, &compression_type.to_le_bytes(), 30..34);

//     //Compressed size of the image, without the size of the header
//     //This size is correct

//     // let compressed_size = file_size - 54;

//     //But when there is no compression (compression type=0), 0 is an allowed size.
//     let compressed_size = 0_u32;

//     set_bytes(&mut vec, &compressed_size.to_le_bytes(), 34..38);

//     //Number of pixels / meter, but 0 is allowed
//     let horizontal_resoultion = 0_u32;
//     set_bytes(&mut vec, &horizontal_resoultion.to_le_bytes(), 38..42);

//     let vertical_resolution = 0_u32;
//     set_bytes(&mut vec, &vertical_resolution.to_le_bytes(), 42..46);

//     //I guess the last two are for other formats/compression types
//     let actually_used_colors = 0_u32;
//     set_bytes(&mut vec, &actually_used_colors.to_le_bytes(), 46..50);

//     let number_of_important_colors = 0_u32;
//     set_bytes(&mut vec, &number_of_important_colors.to_le_bytes(), 50..54);

//     vec
// }

// /// Replaces the bytes of the `to` slice in the specified range with the bytes of the `from` slice.
// fn set_bytes(to: &mut [u8], from: &[u8], range: Range<usize>) {
//     for (from_zero_index, i) in range.enumerate() {
//         to[i] = from[from_zero_index];
//     }
// }

pub fn set_png_image(image: &image::DynamicImage) -> anyhow::Result<()> {
    let _clip = clipboard_win::Clipboard::new_attempts(10)
        .map_err(|e| anyhow::anyhow!("Open clipboard error, code = {}", e))?;
    let res = clipboard_win::empty();
    if let Err(e) = res {
        return Err(anyhow::anyhow!("Empty clipboard error, code = {}", e));
    }
    image_data::add_png_image(image)?;
    image_data::add_cf_dibv5(image)?;
    Ok(())
}

mod image_data {
    use anyhow::Result;
    use image::{DynamicImage, GenericImageView as _};
    use std::{borrow::Cow, io, ptr::copy_nonoverlapping};
    use windows::Win32::{
        Foundation::{HANDLE, HGLOBAL},
        Graphics::Gdi::{DeleteObject, BITMAPV5HEADER, BI_BITFIELDS, HGDIOBJ, LCS_GM_IMAGES},
        System::{
            DataExchange::SetClipboardData,
            Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GHND},
            Ole::CF_DIBV5,
        },
    };

    #[cfg(any(windows, all(unix, not(target_os = "macos"))))]
    pub(crate) struct ScopeGuard<F: FnOnce()> {
        callback: Option<F>,
    }

    #[cfg(any(windows, all(unix, not(target_os = "macos"))))]
    impl<F: FnOnce()> ScopeGuard<F> {
        #[cfg_attr(all(windows), allow(dead_code))]
        pub(crate) fn new(callback: F) -> Self {
            ScopeGuard {
                callback: Some(callback),
            }
        }
    }

    #[cfg(any(windows, all(unix, not(target_os = "macos"))))]
    impl<F: FnOnce()> Drop for ScopeGuard<F> {
        fn drop(&mut self) {
            if let Some(callback) = self.callback.take() {
                (callback)();
            }
        }
    }

    fn last_error(message: &str) -> anyhow::Error {
        let os_error = io::Error::last_os_error();
        anyhow::anyhow!("{}: {}", message, os_error)
    }

    unsafe fn global_unlock_checked(hdata: HGLOBAL) -> Result<()> {
        // If the memory object is unlocked after decrementing the lock count, the function
        // returns zero and GetLastError returns NO_ERROR. If it fails, the return value is
        // zero and GetLastError returns a value other than NO_ERROR.
        GlobalUnlock(hdata)?;
        Ok(())
    }

    pub(super) fn add_cf_dibv5(image: &DynamicImage) -> Result<()> {
        // This constant is missing in windows-rs
        // https://github.com/microsoft/windows-rs/issues/2711
        #[allow(non_upper_case_globals)]
        const LCS_sRGB: u32 = 0x7352_4742;

        let header_size = size_of::<BITMAPV5HEADER>();
        let header = BITMAPV5HEADER {
            bV5Size: header_size as u32,
            bV5Width: image.width() as i32,
            bV5Height: image.height() as i32,
            bV5Planes: 1,
            bV5BitCount: 32,
            bV5Compression: BI_BITFIELDS,
            bV5SizeImage: (4 * image.width() * image.height()),
            bV5XPelsPerMeter: 0,
            bV5YPelsPerMeter: 0,
            bV5ClrUsed: 0,
            bV5ClrImportant: 0,
            bV5RedMask: 0x00ff0000,
            bV5GreenMask: 0x0000ff00,
            bV5BlueMask: 0x000000ff,
            bV5AlphaMask: 0xff000000,
            bV5CSType: LCS_sRGB,
            // SAFETY: Windows ignores this field because `bV5CSType` is not set to `LCS_CALIBRATED_RGB`.
            bV5Endpoints: unsafe { std::mem::zeroed() },
            bV5GammaRed: 0,
            bV5GammaGreen: 0,
            bV5GammaBlue: 0,
            bV5Intent: LCS_GM_IMAGES as u32, // I'm not sure about this.
            bV5ProfileData: 0,
            bV5ProfileSize: 0,
            bV5Reserved: 0,
        };

        // In theory we don't need to flip the image because we could just specify
        // a negative height in the header, which according to the documentation, indicates that the
        // image rows are in top-to-bottom order. HOWEVER: MS Word (and WordPad) cannot paste an image
        // that has a negative height in its header.
        let image = flip_v(image);

        let data_size = header_size + image.2.len();
        let hdata = unsafe { global_alloc(data_size)? };
        unsafe {
            let data_ptr = global_lock(hdata)?;
            let _unlock = ScopeGuard::new(|| {
                let _ = global_unlock_checked(hdata);
            });

            copy_nonoverlapping::<u8>((&header) as *const _ as *const u8, data_ptr, header_size);

            // Not using the `add` function, because that has a restriction, that the result cannot overflow isize
            let pixels_dst = (data_ptr as usize + header_size) as *mut u8;
            copy_nonoverlapping::<u8>(image.2.as_ptr(), pixels_dst, image.2.len());

            let dst_pixels_slice = std::slice::from_raw_parts_mut(pixels_dst, image.2.len());

            // If the non-allocating version of the function failed, we need to assign the new bytes to
            // the global allocation.
            if let Cow::Owned(new_pixels) = rgba_to_win(dst_pixels_slice) {
                // SAFETY: `data_ptr` is valid to write to and has no outstanding mutable borrows, and
                // `new_pixels` will be the same length as the original bytes.
                copy_nonoverlapping::<u8>(new_pixels.as_ptr(), data_ptr, new_pixels.len())
            }
        }

        if let Err(err) = unsafe { SetClipboardData(CF_DIBV5.0 as u32, Some(HANDLE(hdata.0))) } {
            let _ = unsafe { DeleteObject(HGDIOBJ(hdata.0)) };
            Err(err.into())
        } else {
            Ok(())
        }
    }

    pub(super) fn add_png_image(image: &DynamicImage) -> Result<()> {
        let buf = image.as_bytes();

        // Register PNG format.
        let format_id = match clipboard_win::register_format("PNG") {
            Some(format_id) => format_id.into(),
            None => return Err(last_error("Cannot register PNG clipboard format.")),
        };

        let data_size = buf.len();
        let hdata = unsafe { global_alloc(data_size)? };
        unsafe {
            let pixels_dst = global_lock(hdata)?;
            copy_nonoverlapping::<u8>(buf.as_ptr(), pixels_dst, data_size);
            let _ = global_unlock_checked(hdata);
        }

        if let Err(err) = unsafe { SetClipboardData(format_id, Some(HANDLE(hdata.0))) } {
            let _ = unsafe { DeleteObject(HGDIOBJ(hdata.0)) };
            return Err(anyhow::anyhow!("SetClipboardData Error {}", err));
        }
        Ok(())
    }

    unsafe fn global_alloc(bytes: usize) -> Result<HGLOBAL> {
        let hdata = GlobalAlloc(GHND, bytes)?;
        if hdata.is_invalid() {
            Err(last_error("Could not allocate global memory object"))
        } else {
            Ok(hdata)
        }
    }

    unsafe fn global_lock(hmem: HGLOBAL) -> Result<*mut u8> {
        let data_ptr = GlobalLock(hmem) as *mut u8;
        if data_ptr.is_null() {
            Err(last_error("Could not lock the global memory object"))
        } else {
            Ok(data_ptr)
        }
    }

    /// Vertically flips the image pixels in memory
    fn flip_v(image: &DynamicImage) -> (i32, i32, Vec<u8>) {
        let w = image.width() as usize;
        let h = image.height() as usize;

        let mut bytes = to_bgr_bytes(image);

        let rowsize = w * 4; // each pixel is 4 bytes
        let mut tmp_a = vec![0; rowsize];
        // I believe this could be done safely with `as_chunks_mut`, but that's not stable yet
        for a_row_id in 0..(h / 2) {
            let b_row_id = h - a_row_id - 1;

            // swap rows `first_id` and `second_id`
            let a_byte_start = a_row_id * rowsize;
            let a_byte_end = a_byte_start + rowsize;
            let b_byte_start = b_row_id * rowsize;
            let b_byte_end = b_byte_start + rowsize;
            tmp_a.copy_from_slice(&bytes[a_byte_start..a_byte_end]);
            bytes.copy_within(b_byte_start..b_byte_end, a_byte_start);
            bytes[b_byte_start..b_byte_end].copy_from_slice(&tmp_a);
        }

        (h as i32, w as i32, bytes)
    }

    fn to_bgr_bytes(image: &DynamicImage) -> Vec<u8> {
        let mut byte_vec = Vec::with_capacity((image.width() * image.height() * 4) as usize);
        for (_, _, pixel) in image.pixels() {
            //Setting the pixels, one by one

            let pixel_bytes = pixel.0;
            //One pixel is 4 bytes, BGR and unused
            byte_vec.push(pixel_bytes[0]);
            byte_vec.push(pixel_bytes[1]);
            byte_vec.push(pixel_bytes[2]);
            byte_vec.push(pixel_bytes[3]); //This is unused based on the specifications
        }

        byte_vec
    }

    /// Converts the RGBA (u8) pixel data into the bitmap-native ARGB (u32)
    /// format in-place.
    ///
    /// Safety: the `bytes` slice must have a length that's a multiple of 4
    #[allow(clippy::identity_op, clippy::erasing_op)]
    #[must_use]
    unsafe fn rgba_to_win(bytes: &mut [u8]) -> Cow<'_, [u8]> {
        // Check safety invariants to catch obvious bugs.
        debug_assert_eq!(bytes.len() % 4, 0);

        let mut u32pixels_buffer = convert_bytes_to_u32s(bytes);
        let u32pixels = match u32pixels_buffer {
            ImageDataCow::Borrowed(ref mut b) => b,
            ImageDataCow::Owned(ref mut b) => b.as_mut_slice(),
        };

        for p in u32pixels.iter_mut() {
            let [mut r, mut g, mut b, mut a] = p.to_ne_bytes().map(u32::from);
            r <<= 2 * 8;
            g <<= 1 * 8;
            b <<= 0 * 8;
            a <<= 3 * 8;

            *p = r | g | b | a;
        }

        match u32pixels_buffer {
            ImageDataCow::Borrowed(_) => Cow::Borrowed(bytes),
            ImageDataCow::Owned(bytes) => {
                Cow::Owned(bytes.into_iter().flat_map(|b| b.to_ne_bytes()).collect())
            }
        }
    }

    // XXX: std's Cow is not usable here because it does not allow mutably
    // borrowing data.
    enum ImageDataCow<'a> {
        Borrowed(&'a mut [u32]),
        Owned(Vec<u32>),
    }

    /// Safety: the `bytes` slice must have a length that's a multiple of 4
    unsafe fn convert_bytes_to_u32s(bytes: &mut [u8]) -> ImageDataCow<'_> {
        // When the correct conditions are upheld, `std` should return everything in the well-aligned slice.
        let (prefix, _, suffix) = bytes.align_to::<u32>();

        // Check if `align_to` gave us the optimal result.
        //
        // If it didn't, use the slow path with more allocations
        if prefix.is_empty() && suffix.is_empty() {
            // We know that the newly-aligned slice will contain all the values
            ImageDataCow::Borrowed(bytes.align_to_mut::<u32>().1)
        } else {
            // XXX: Use `as_chunks` when it stabilizes.
            let u32pixels_buffer = bytes
                .chunks(4)
                .map(|chunk| u32::from_ne_bytes(chunk.try_into().unwrap()))
                .collect();
            ImageDataCow::Owned(u32pixels_buffer)
        }
    }
}
