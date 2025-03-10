// import { redirect } from "next/navigation";

import { invoke } from "@tauri-apps/api/core";

let BASE_API = "";

export async function base_api(): Promise<string> {
	if (BASE_API) {
		return Promise.resolve(BASE_API);
	}
	return invoke("get_local_serve_port").then((port) => {
		BASE_API = `http://localhost:${port}`;
		return BASE_API;
	});
}

// const DEFAULT_HEADERS = {
// authorization: `Bearer ${
//   typeof window !== "undefined" && localStorage.getItem("AUTH-TOKEN")
// }`,
// };

export type RequestConfig = RequestInit & {
	params?: Record<string, any>;
	responseType?: "arraybuffer";
	baseURL?: string;
	// TODO: 还未实现超时时间
	timeout?: number;
	onDownloadProgress?: (total: number, loaded: number) => void;
	getToken?: () => Promise<string | undefined>;
};

export class RequestError extends Error {
	public code = 500;
	public errMsg = "";

	constructor(code: number, errMsg: string) {
		super(errMsg);
		this.code = code;
		this.errMsg = errMsg;
	}
}

type QsOption = {
	arrayFormat?: "brackets" | "indices";
};

export const JsonToUrlParams = (function () {
	let str = "";

	const config: { options?: QsOption } = {};

	const isObject = (value: any) =>
		value instanceof Object && !(value instanceof Function);

	function append(key: string, val: string) {
		str += `${key}=${encodeURIComponent(val)}&`;
	}

	function appendArray(key: string, val: any) {
		const entries = Object.entries(val);
		for (const entry of entries) {
			const [index, value] = entry as any;
			if (typeof value === "undefined" || value === null) continue;
			const idx = (function () {
				if (config.options?.arrayFormat === "brackets") {
					return Number.isNaN(Number(index)) ? index : "";
				}
				return index;
			})();
			if (isObject(value)) {
				appendArray(`${key}[${idx}]`, value);
			} else {
				append(`${key}[${idx}]`, value);
			}
		}
	}

	return function (obj: Record<string, any>, options?: QsOption): string {
		str = "";
		config.options = {
			arrayFormat: "brackets",
			...options,
		};

		const entries = Object.entries(obj);
		for (const entry of entries) {
			const [key, val] = entry;
			if (typeof val === "undefined" || val === null) continue;
			if (isObject(val)) {
				appendArray(key, val);
			} else {
				append(key, val);
			}
		}

		return str.replace(/.$/, "");
	};
})();

export class HyperRequest {
	constructor(
		public defaults: RequestConfig = {
			baseURL: "",
		},
	) {}

	public get(url: string, config?: RequestConfig) {
		return this._request(url, "GET", undefined, config);
	}

	public post<T = any, D = any>(
		url: string,
		data?: D,
		config?: RequestConfig,
	): Promise<T> {
		return this._request(url, "POST", data, config);
	}

	private async _request<T = any, D = any>(
		url: string,
		method: "GET" | "POST",
		data?: D,
		reqInit?: RequestConfig,
	): Promise<T> {
		const requestConfig = { ...this.defaults, ...reqInit };
		const isFormData = data instanceof FormData;
		let url_path = url;
		if (method === "GET" && requestConfig?.params) {
			url_path += `?${JsonToUrlParams(requestConfig.params)}`;
		}
		const authToken = await requestConfig.getToken?.();
		const headers: Record<string, any> = {
			...this.defaults.headers,
			...requestConfig.headers,
			// TODO: 开发时默认使用中文
			lang: "zh_CN", //await getApiLocale(),
		};
		if (authToken) {
			// headers["Authorization"] = `Bearer ${authToken}`;
			headers.Authorization = `${authToken}`;
		}
		if (method === "POST" && !isFormData) {
			headers["Content-Type"] = "application/json";
		}
		const controller = new AbortController();
		const init: RequestConfig = {
			method,
			...requestConfig,
			headers,
			signal: controller.signal,
		};
		if (method === "POST" && data) {
			init.body = isFormData ? data : JSON.stringify(data);
		}
		const baseURL = await base_api();
		const res = await Promise.race([
			fetch(baseURL + url_path, init),
			new Promise<Response>((resolve) =>
				setTimeout(() => {
					controller.abort();
					resolve(
						new Response(null, { status: 408, statusText: "Request Timeout" }),
					);
				}, init.timeout || 60000),
			),
		]);
		if (res.status >= 400) {
			if (res.status === 401) {
				return Promise.reject(new RequestError(401, "登录失效"));
			}
			if (res.status === 429) {
				return Promise.reject(
					new RequestError(429, "请求过于频繁，请稍后再试"),
				);
			}
			try {
				const resData = await res.json();
				return Promise.reject(
					new RequestError(resData.code, resData.msg || "Server Unknown Error"),
				);
			} catch (e: any) {
				return Promise.reject(
					new RequestError(
						res.status,
						res.statusText || "Server Unknown Error",
					),
				);
			}
		} else if (init.responseType === "arraybuffer") {
			if (reqInit?.onDownloadProgress) {
				const contentLength = res.headers.get("Content-Length");
				const total = contentLength ? +contentLength : 0;
				const reader = res.body!.getReader();
				return this._download(reader, total, reqInit.onDownloadProgress) as T;
			}
			return { data: res.arrayBuffer() } as T;
		} else {
			const resData = await res.json();
			const code = resData.code;
			if (code !== 200) {
				return Promise.reject(new RequestError(resData.code, resData.msg));
			}
			return resData;
		}
	}

	private async _download(
		reader: ReadableStreamDefaultReader<Uint8Array>,
		total: number,
		onDownloadProgress: RequestConfig["onDownloadProgress"],
	) {
		let receivedLength = 0; // 当前接收到了这么多字节
		const chunks = []; // 接收到的二进制块的数组（包括 body）
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				break;
			}

			chunks.push(value);
			receivedLength += value.length;
			if (onDownloadProgress) {
				onDownloadProgress(total, receivedLength);
			}
		}
		const chunksAll = new Uint8Array(receivedLength);
		let position = 0;
		for (const chunk of chunks) {
			chunksAll.set(chunk, position); // (4.2)
			position += chunk.length;
		}
		return { data: chunksAll.buffer };
	}
}

export function toastFail(err: RequestError) {
	return Promise.reject(err);
}

const request = new HyperRequest({
	baseURL: "",
	//   headers: DEFAULT_HEADERS,
	timeout: 60000 * 10,
	//   getToken: typeof window !== "undefined" ? () => getAuthToken() : () => getAuthTokenCookie()
});

export default request;
