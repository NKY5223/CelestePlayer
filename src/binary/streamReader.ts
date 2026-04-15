import { AsyncBinNumReader } from "./defs.js";

type ByteArray = Uint8Array<ArrayBuffer>;
/** 
 * Basic binary reader for byte streams. 
 * 
 * NOTE: Cannot backtrack since chunks are forgotten immediately after use. 
 */
export class BaseBinaryStreamReader implements Disposable {
	/** An empty `Uint8Array`. Use to reset stuff. */
	static readonly EMPTY: ByteArray = new Uint8Array(0);

	protected readonly reader: ReadableStreamBYOBReader;
	protected chunk: ByteArray = BaseBinaryStreamReader.EMPTY;
	protected chunkIndex: number = 0;

	/** Offset of chunk in the stream. */
	#streamIndex: number = 0;
	/** Current byte index in the stream. Starts from 0 when the reader is constructed. */
	public get index(): number {
		return this.#streamIndex - this.chunk.byteLength + this.chunkIndex;
	}
	#done: boolean = false;
	/** Whether the stream is done. */
	public get done(): boolean {
		return this.#done;
	}

	constructor(
		readonly stream: ReadableStream<ByteArray>, 
		/** Size of chunks read */
		readonly chunkSize = 0x10000
	) {
		if (stream.locked) {
			throw new Error("BinaryStreamReader received a locked stream.");
		}
		this.reader = stream.getReader({
			mode: "byob"
		});
	}
	/** 
	 * Dispose this reader by:
	 * - Releasing the stream reader
	 * - Forgetting the stored chunk
	 */
	dispose(): void {
		this.reader.releaseLock();
		this.chunk = BaseBinaryStreamReader.EMPTY;
	}
	[Symbol.dispose](): void {
		this.dispose();
	}

	/** 
	 * Use {@linkcode readBytes} instead.
	 * NOTE: `buffer` WILL be detached and must be discarded. 
	 */
	private async readIntoFromStream(buffer: ByteArray): Promise<ByteArray> {
		if (this.#done) {
			throw new Error("Stream is already done.");
		}
		const count = buffer.byteLength;
		const res = await this.reader.read(buffer, {
			min: count
		});
		if (res.done) this.#done = true;
		if (res.value === undefined) {
			throw new Error("Reader returned undefined.");
		}
		const newBuffer = res.value;
		this.#streamIndex += newBuffer.byteLength;
		if (!res.done && newBuffer.byteLength !== count) {
			console.warn(`Insufficient elements: ${newBuffer.byteLength}/${count} @ ${this.#streamIndex} (possible EoStream, but .done was false)`);
		}

		return newBuffer;
	}
	/** 
	 * Use {@linkcode readBytes} instead.
	 */
	private async readBytesFromStream(size: number): Promise<ByteArray> {
		if (!isFinite(size) || size < 0) {
			throw new RangeError("Expected count to be finite and nonnegative.");
		}
		return this.readIntoFromStream(new Uint8Array(size));
	}
	private readChunk() { return this.readBytesFromStream(this.chunkSize); }
	/** 
	 * If chunk does not encompass the next `size` bytes, load them.
	 */
	protected async loadBytes(size: number): Promise<void> {
		// insufficient elements, read until enough
		if (this.chunkIndex + size > this.chunk.byteLength) {
			const arrays: ByteArray[] = [];
			let newSize = 0;
			if (this.chunk) {
				arrays.push(this.chunk.subarray(this.chunkIndex));
				newSize += this.chunk.byteLength - this.chunkIndex;
			}
			while (size > newSize) {
				if (this.done) {
					throw new Error("Stream ended before enough bytes could be read.");
				}
				const next = await this.readChunk();
				arrays.push(next);
				newSize += next.byteLength;
			}
			this.chunk = new Uint8Array(newSize);
			let i = 0;
			for (const arr of arrays) {
				this.chunk.set(arr, i);
				i += arr.byteLength;
			}
			this.chunkIndex = 0;
		}
	}
	/** 
	 * @returns a `Uint8Array` containing the next `size` bytes.
	 * 
	 * NOTE: Do **NOT** modify the resulting array; 
	 * use {@linkcode readBytesCopy} if you want to do that.  
	 * This is because this function returns a *subarray* of the current chunk, 
	 * and modifying it *could* lead to strange behaviour.
	 * 
	 * Also, the returned `Uint8Array` will most likely be offset from its underlying buffer.
	 * Do not assume `.byteOffset` is 0.
	 */
	async readBytes(size: number): Promise<ByteArray> {
		this.loadBytes(size);
		const arr = this.chunk.subarray(this.chunkIndex, this.chunkIndex + size);
		this.chunkIndex += size;
		return arr;
	}

	/**
	 * @returns the next `size` bytes as a `Uint8Array`.
	 * 
	 * Use this function when you need to modify the array; 
	 * use {@linkcode readBytes} if you do not have to, since this function copies the array. 
	 */
	async readBytesCopy(size: number): Promise<ByteArray> {
		const bytes = await this.readBytes(size);
		return bytes.slice();
	}
}

/** Note: Reads things in little-endian. Might add a paramter for that but c# uses little endian so */
export class BinaryStreamReader extends BaseBinaryStreamReader implements AsyncBinNumReader {
	protected viewedChunk = this.chunk;
	protected view: DataView = new DataView(this.chunk.buffer);

	dispose(): void {
		super.dispose();
		this.viewedChunk = BaseBinaryStreamReader.EMPTY;
	}

	protected async updateView(): Promise<boolean> {
		if (this.viewedChunk !== this.chunk) {
			this.view = new DataView(this.chunk.buffer);
			this.viewedChunk = this.chunk;
		}
		return false;
	}
	protected async readMethod<K extends keyof DataView & `get${string}`>(size: number, method: K): Promise<ReturnType<DataView[K]>> {
		await this.loadBytes(size);
		await this.updateView();
		// typescript turns DataView[K](0) into number|bigint for some reason
		const res = this.view[method](this.chunkIndex, true) as never;
		this.chunkIndex += size;
		return res;
	}

	readInt8() { return this.readMethod(8 / 8, "getInt8"); }
	readInt16() { return this.readMethod(16 / 8, "getInt16"); }
	readInt32() { return this.readMethod(32 / 8, "getInt32"); }
	readUint8() { return this.readMethod(8 / 8, "getUint8"); }
	readUint16() { return this.readMethod(16 / 8, "getUint16"); }
	readUint32() { return this.readMethod(32 / 8, "getUint32"); }
	readBigint64() { return this.readMethod(64 / 8, "getBigInt64"); }
	readBiguint64() { return this.readMethod(64 / 8, "getBigUint64"); }
	readFloat32() { return this.readMethod(32 / 8, "getFloat32"); }
	readFloat64() { return this.readMethod(64 / 8, "getFloat64"); }
}