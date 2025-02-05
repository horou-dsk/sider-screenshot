export type MonitorInfo = {
  width: number;
  height: number;
  x: number;
  y: number;
  is_primary: boolean;
  scale_factor: number;
  id: number;
  name: string;
};

export type WindowInfo = {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hwnd: string;
};

export type ShotShowWindowPayload = {
  window_info: WindowInfo[];
  monitor_info: MonitorInfo[];
  min_x: number;
  min_y: number;
};

export type QuickSearchApp = {
  path: string;
  name: string;
  icon: string;
};
