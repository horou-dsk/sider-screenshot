import { screen_capture } from "../screenshot/capture";

function Root() {
  return (
    <div class="h-screen w-screen flex items-center justify-center bg-slate-100 dark:bg-[#2f2f2f]">
      <button
        class="bg-blue-500 text-white px-4 py-2 rounded-md"
        onClick={async () => {
          await screen_capture();
        }}
      >
        截屏
      </button>
    </div>
  );
}

export default Root;
