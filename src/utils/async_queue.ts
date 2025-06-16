export default class AsyncQueue {
	private _queue: ((result: any) => Promise<any | undefined>)[] = [];
	private _running = false;

	private _lastResult: any;

	async runNext() {
		if (this._running || this._queue.length === 0) return;
		this._running = true;
		while (true) {
			const task = this._queue.shift();
			if (task) {
				this._lastResult = await task(this._lastResult);
			} else {
				break;
			}
		}
		this._running = false;
	}

	add<T = any>(task: (result?: T) => Promise<any | undefined>) {
		this._queue.push(task);
		this.runNext();
	}
}
