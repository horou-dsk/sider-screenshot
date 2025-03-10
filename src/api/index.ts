import request, { base_api } from "../utils/request";

export function fetchApps() {
	return request.get("/sys/quick_search/apps");
}

export function runApp(id: string) {
	return request.get(`/sys/quick_search/run_app/${id}`);
}

export async function chat(
	model: string,
	messages: { content: string; role: string }[],
) {
	const baseURL = await base_api();
	return fetch(`${baseURL}/ai/ollama/chat`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ model, messages }),
	}).then((res) => res.body?.getReader());
	// return request.post("/ai/ollama/chat", { model, messages });
}

export function embedding_with_file(model: string, file_path: string) {
	return request.post("/ai/ollama/embedding_with_file", {
		model,
		file_path,
		file_type: "pdf",
	});
}

export function vector_search(model: string, query: string, limit: number) {
	return request.post("/ai/ollama/vector_search", [model, query, limit]);
}

export async function request_capture_screen() {
	const baseURL = await base_api();
	return fetch(`${baseURL}/sys/screenshot/capture`, {
		method: "GET",
	});
}
