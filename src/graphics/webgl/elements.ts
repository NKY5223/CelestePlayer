import { WebGlBase } from "./base.js";

export class ElementIndexManager {
	/** Element indices */
	protected readonly indices: number[] = [];

	#count: number = 0;
	/** Number of indices currently in buffer. */
	public get count(): number { return this.#count; }

	#type: "UNSIGNED_BYTE" | "UNSIGNED_SHORT" = "UNSIGNED_SHORT";
	/** Type used for indices in buffer. */
	public get indexType() { return this.#type; }

	constructor(readonly base: WebGlBase) {
		this.bindElements();
	}
	readonly buffer: WebGLBuffer = this.base.createBuffer();

	/** Binds the indices buffer to `ELEMENT_ARRAY_BUFFER`. */
	bindElements(): void {
		this.base.bindBuffer("ELEMENT_ARRAY_BUFFER", this.buffer);
	}

	addIndex(...indices: readonly number[]) {
		this.indices.push(...indices);
	}
	addIndices(indices: readonly number[]) {
		this.indices.push(...indices);
	}


	flush(): void {
		this.base.setBuffer("ELEMENT_ARRAY_BUFFER", this.buffer, new Uint16Array(this.indices), "DYNAMIC_DRAW");
		this.#count = this.indices.length;
		this.clear();
	}
	clear(): void {
		this.indices.length = 0;
	}
}