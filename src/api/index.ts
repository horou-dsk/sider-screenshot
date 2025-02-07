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
