import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

const queryClient = new QueryClient();

const routes = createBrowserRouter([
  {
    path: "/sider",
    Component: lazy(() => import("./app/root/Root.tsx")),
  },
  {
    path: "/sider/screenshot",
    Component: lazy(() => import("./app/screenshot/ScreenShot.tsx")),
  },
  {
    path: "/sider/quick-start",
    Component: lazy(() => import("./app/quick-start/QuickStart.tsx")),
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <RouterProvider router={routes} />
    </QueryClientProvider>
  );
}

export default App;
