import { GlUsage, WebGlBase, WebGlLike, WebGlType } from "./base.js";

/** Uses a seperate buffer for each attribute. */
export class SeperateBufferAttribManager {
	readonly buffers: Map<string, WebGLBuffer> = new Map();
	
	constructor(readonly base: WebGlBase) { }

	readonly gl = this.base.gl;

	/** Sets a `float` attrib. */
	setAttribF1(name: string, values: readonly WebGlLike.Float[], usage: GlUsage = "DYNAMIC_DRAW"): void {
		this.setAttribData(name, new Float32Array(values), WebGlType.Float, usage);
	}
	/** Sets a `vec2` attrib. */
	setAttribF2(name: string, values: readonly WebGlLike.Float2[], usage: GlUsage = "DYNAMIC_DRAW"): void {
		const data = new Float32Array(2 * values.length);
		let i = 0;
		for (const vec of values) {
			data[i++] = vec[0];
			data[i++] = vec[1];
		}
		this.setAttribData(name, data, WebGlType.Float2, usage);
	}
	/** Sets a `vec3` attrib. */
	setAttribF3(name: string, values: readonly WebGlLike.Float3[], usage: GlUsage = "DYNAMIC_DRAW"): void {
		const data = new Float32Array(3 * values.length);
		let i = 0;
		for (const vec of values) {
			data[i++] = vec[0];
			data[i++] = vec[1];
			data[i++] = vec[2];
		}
		this.setAttribData(name, data, WebGlType.Float3, usage);
	}
	/** Sets a `vec4` attrib. */
	setAttribF4(name: string, values: readonly WebGlLike.Float4[], usage: GlUsage = "DYNAMIC_DRAW"): void {
		const data = new Float32Array(4 * values.length);
		let i = 0;
		for (const vec of values) {
			data[i++] = vec[0];
			data[i++] = vec[1];
			data[i++] = vec[2];
			data[i++] = vec[3];
		}
		this.setAttribData(name, data, WebGlType.Float4, usage);
	}

	/** Bind a buffer to some data and set an attrib to use that buffer. */
	setAttribData(
		name: string,
		data: AllowSharedBufferSource,
		type: WebGlType,
		usage: GlUsage = "DYNAMIC_DRAW",
		normalized: GLboolean = false,
		stride: GLsizei = 0,
		offset: GLintptr = 0,
	): void {
		const buffer = this.getAttribBuffer(name);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl[usage]);

		this.base.setAttribBuffer(name, buffer, type, normalized, stride, offset);
	}


	/** Gets buffer assigned to a specific attrib. */
	getAttribBuffer(name: string): WebGLBuffer {
		return this.buffers.getOrInsertComputed(name, () => this.gl.createBuffer());
	}

	dispose(): void {
		for (const [, buffer] of this.buffers) {
			this.gl.deleteBuffer(buffer);
		}
		this.buffers.clear();
	}
}