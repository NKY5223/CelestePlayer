/** Binary reader for byte streams. Cannot backtrack since chunks are forgotten immediately after use. */
export class BaseBinaryStreamReader implements Disposable {
	protected readonly reader: ReadableStreamBYOBReader;
	#index: number = 0;
	public get index(): number {
		return this.#index;
	}
	#done: boolean = false;
	public get done(): boolean {
		return this.#done;
	}

	constructor(readonly stream: ReadableStream<Uint8Array<ArrayBuffer>>) {
		if (stream.locked) {
			throw new Error("BinaryStreamReader received a locked stream.");
		}
		this.reader = stream.getReader({
			mode: "byob"
		});
	}
	dispose(): void {
		this.reader.releaseLock();
	}
	[Symbol.dispose](): void {
		this.dispose();
	}
	
	async readNext(count: number): Promise<number[]> {
		if (this.#done) {
			throw new Error("Stream is already done.");
		}
		if (!isFinite(count) || count < 0) {
			throw new RangeError("Expected count to be finite and nonnegative.");
		}
		const res = await this.reader.read(new Uint8Array(count));
		if (res.done) this.#done = true;

		
		return [];
	}
}