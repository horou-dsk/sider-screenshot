import { createMemo, onMount } from "solid-js";
import { CanvasRenderImage } from "./types";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ScreenShotCanvasRef = {
  capture: () => Promise<{ bytes: Blob; width: number; height: number }>;
};

function canvasToUint8Array(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // 将 canvas 转换为 Blob（图片格式）
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to convert canvas to Blob."));
      }
      // if (blob) {
      //   const reader = new FileReader();

      //   // 将 Blob 转换为 ArrayBuffer
      //   reader.onload = () => {
      //     resolve(new Uint8Array(reader.result as ArrayBuffer));
      //   };

      //   reader.onerror = () => reject(reader.error);

      //   reader.readAsArrayBuffer(blob);
      // } else {
      //   reject(new Error("Failed to convert canvas to Blob."));
      // }
    }, "image/png"); // 指定格式为 PNG
  });
}

function ScreenShotCanvas(props: {
  rect: Rect;
  screenShots: CanvasRenderImage[];
  borderWidth: number;
  ref?: (ref: ScreenShotCanvasRef) => void;
}) {
  let canvas: HTMLCanvasElement | undefined;

  const rect = createMemo(() => ({
    x: Math.round(props.rect.x * window.devicePixelRatio),
    y: Math.round(props.rect.y * window.devicePixelRatio),
    width: Math.round(props.rect.width * window.devicePixelRatio),
    height: Math.round(props.rect.height * window.devicePixelRatio),
  }));

  // const rect = createMemo(() => props.rect);

  // const app = new Application();
  // onMount(async () => {
  //   const _rect = rect();
  //   await app.init({
  //     canvas: canvas!,
  //     width: _rect.width,
  //     height: _rect.height,
  //     backgroundAlpha: 0,
  //     resolution: window.devicePixelRatio,
  //     autoDensity: true,
  //     antialias: true,
  //     preference: "webgpu",
  //   });
  //   const container = new Container();
  //   container.x = -_rect.x;
  //   container.y = -_rect.y;
  //   console.log(-_rect.x, -_rect.y);
  //   for (const { screenshotUrl, monitorInfo } of props.screenShots) {
  //     const info = {
  //       x: getDpiPx(monitorInfo.x),
  //       y: getDpiPx(monitorInfo.y),
  //       width: getDpiPx(monitorInfo.width),
  //       height: getDpiPx(monitorInfo.height),
  //     };
  //     const texture = await Assets.load(screenshotUrl);
  //     const sprite = new Sprite(texture);
  //     sprite.x = info.x;
  //     sprite.y = info.y;
  //     sprite.width = info.width;
  //     sprite.height = info.height;
  //     container.addChild(sprite);
  //     // ctx!.drawImage(image, info.x, info.y, info.width, info.height);
  //   }
  //   app.stage.addChild(container);
  // });
  // onCleanup(() => {
  //   app.destroy();
  //   console.log("destroy");
  // });

  onMount(() => {
    const _rect = rect();
    const ctx = canvas!.getContext("2d");
    // console.log(_rect);
    for (const { image, monitorInfo } of props.screenShots) {
      const info = {
        x: Math.round(monitorInfo.x - _rect.x),
        y: Math.round(monitorInfo.y - _rect.y),
        width: monitorInfo.width,
        height: monitorInfo.height,
      };
      // console.log(info);
      ctx!.drawImage(image, info.x, info.y, info.width, info.height);
    }

    props.ref?.({
      capture: async () => {
        return {
          bytes: await canvasToUint8Array(canvas!),
          width: _rect.width,
          height: _rect.height,
        };
      },
    });
  });
  return (
    <canvas
      ref={canvas}
      class="absolute bg-transparent"
      width={rect().width}
      height={rect().height}
      style={{
        left: `-${props.borderWidth}px`,
        top: `-${props.borderWidth}px`,
        width: props.rect.width + "px",
        height: props.rect.height + "px",
      }}
    ></canvas>
  );
}

export default ScreenShotCanvas;
