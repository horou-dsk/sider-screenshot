export function fetchApps() {
  return fetch("http://localhost:8088/sys/quick_search/apps", {
    method: "GET",
  }).then((res) => res.json());
}
