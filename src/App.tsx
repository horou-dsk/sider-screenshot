import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

const queryClient = new QueryClient();

const routes = createBrowserRouter([
	{
		path: "/",
		Component: lazy(() => import("./app/root/Root.tsx")),
	},
	{
		path: "/screenshot",
		Component: lazy(() => import("./app/screenshot/ScreenShot.tsx")),
	},
	{
		path: "/quick-start",
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
