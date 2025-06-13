import type { MonitorInfo } from "../types";

export type ScreenShotImage = {
	monitorInfo: MonitorInfo;
	screenshotUrl: string;
};

export type CanvasRenderImage = {
	monitorInfo: MonitorInfo;
	image: HTMLImageElement;
};
