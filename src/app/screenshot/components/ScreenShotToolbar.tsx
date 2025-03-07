import { CloseOutlined, CheckOutlined } from "@ant-design/icons";

type Props = {
	onClose: () => void;
	onSave: () => void;
};

function ScreenShotToolbar(props: Props) {
	return (
		<div className="dark:bg-[#333] bg-white rounded-md h-10">
			<div className="flex justify-between items-center h-full text-xl">
				<button
					type="button"
					className="h-full w-12 flex justify-center items-center hover:scale-125 transition-transform"
					onClick={props.onClose}
				>
					<CloseOutlined />
				</button>
				<button
					type="button"
					className="h-full w-12 flex justify-center items-center hover:scale-125 transition-transform"
					onClick={props.onSave}
				>
					<CheckOutlined />
				</button>
			</div>
		</div>
	);
}

export default ScreenShotToolbar;
