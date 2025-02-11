import request, { HOST } from "../utils/request";

export function fetchApps() {
  return fetch("http://localhost:8088/sys/quick_search/apps", {
    method: "GET",
  }).then((res) => res.json());
}

export function runApp(id: string) {
  return fetch("http://localhost:8088/sys/quick_search/run_app/" + id, {
    method: "GET",
  }).then((res) => res.json());
}

export function chat(
  model: string,
  messages: { content: string; role: string }[]
) {
  return fetch(HOST + "/ai/ollama/chat", {
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
