import { SyncBinNumReader } from "./types.js";

export class BinaryBufferReader implements SyncBinNumReader {
	readonly view: DataView;
	#index: number = 0;
	public get index(): number {
		return this.#index;
	}
	
	constructor(readonly buffer: ArrayBufferLike) {
		this.view = new DataView(buffer);
	}
	protected readMethod<K extends keyof DataView & `get${string}`>(size: number, method: K): ReturnType<DataView[K]> {
		// typescript turns DataView[K](0) into number|bigint for some reason
		const res = this.view[method](this.#index, true) as never;
		this.#index += size;
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