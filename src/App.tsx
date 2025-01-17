import { Router } from "@solidjs/router";
import { lazy } from "solid-js";
import "./App.css";

const routes = [
  {
    path: "/sider",
    component: lazy(() => import("./app/root/Root.tsx")),
  },
  {
    path: "/sider/screenshot",
    component: lazy(() => import("./app/screenshot/ScreenShot.tsx")),
  },
  {
    path: "/sider/quick-start",
    component: lazy(() => import("./app/quick-start/QuickStart.tsx")),
  },
];

function App() {
  return <Router>{routes}</Router>;
}

export default App;
