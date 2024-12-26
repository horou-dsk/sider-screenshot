import { FiCheck, FiX } from "solid-icons/fi";

type Props = {
  onClose: () => void;
  onSave: () => void;
};

function ScreenShotToolbar(props: Props) {
  return (
    <div class="dark:bg-[#333] bg-white rounded-md h-10">
      <div class="flex justify-between items-center h-full text-xl">
        <button
          class="h-full w-12 flex justify-center items-center hover:scale-125 transition-transform"
          onClick={props.onClose}
        >
          <FiX />
        </button>
        <button
          class="h-full w-12 flex justify-center items-center hover:scale-125 transition-transform"
          onClick={props.onSave}
        >
          <FiCheck />
        </button>
      </div>
    </div>
  );
}

export default ScreenShotToolbar;
