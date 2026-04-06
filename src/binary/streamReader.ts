import { AsyncBinNumReader } from "./types.js";

/** 
 * Basic binary reader for byte streams. 
 * does NOT use chunks so it's SLOW AS FUCK when you're reading small ranges of bytes
 * NOTE: Cannot backtrack since chunks are forgotten immediately after use. 
 */
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

	constructor(
		readonly stream: ReadableStream<Uint8Array<ArrayBuffer>>, 
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
	 */
	dispose(): void {
		this.reader.releaseLock();
	}
	[Symbol.dispose](): void {
		this.dispose();
	}

	/** NOTE: `buffer` WILL be detached and must be discarded. */
	async readInto(buffer: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
		if (this.#done) {
			throw new Error("Stream is already done.");
		}
		const count = buffer.byteLength;
		this.#index += count;
		const res = await this.reader.read(buffer, {
			min: count
		});
		if (res.done) this.#done = true;
		if (res.value === undefined) {
			throw new Error("Reader returned undefined.");
		}
		const newBuffer = res.value;
		if (newBuffer.byteLength !== count) {
			throw new Error(`Read ${newBuffer.byteLength}/${count} elements (possible EOS(tream))`);
		}

		return newBuffer;
	}
	async readBytes(count: number): Promise<Uint8Array<ArrayBuffer>> {
		if (!isFinite(count) || count < 0) {
			throw new RangeError("Expected count to be finite and nonnegative.");
		}
		return this.readInto(new Uint8Array(count));
	}
}

/** Note: Reads things in little-endian. Might add a paramter for that but c# uses little endian so */
export class BinaryStreamReader extends BaseBinaryStreamReader implements AsyncBinNumReader {
	protected async readBytesIntoView(count: number): Promise<DataView<ArrayBuffer>> {
		const bytes = await this.readBytes(count);
		return new DataView(bytes.buffer);
	}
	protected async readMethod<K extends keyof DataView & `get${string}`>(count: number, method: K): Promise<ReturnType<DataView[K]>> {
		const view = await this.readBytesIntoView(count);
		// typescript turns DataView[K](0) into number|bigint for some reason
		return view[method](0, true) as never;
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