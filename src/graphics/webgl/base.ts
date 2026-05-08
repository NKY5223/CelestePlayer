
// #region WebGl types
/** Treat as enum type. Do not copy/create instances. */
export type WebGlType = {
	readonly type: "BYTE" | "SHORT" | "UNSIGNED_BYTE" | "UNSIGNED_SHORT" | "FLOAT";
	readonly size: 1 | 2 | 3 | 4;
};
const mkTy = <T extends WebGlType["type"], S extends WebGlType["size"]>(type: T, size: S) => {
	return {
		type,
		size,
	} as const;
};
export const WebGlType = {
	Float: mkTy("FLOAT", 1),
	Float2: mkTy("FLOAT", 2),
	Float3: mkTy("FLOAT", 3),
	Float4: mkTy("FLOAT", 4),
} as const satisfies Record<string, WebGlType>;

// #region webgl-like ts types
type Comp2 = 0 | 1;
type Comp3 = Comp2 | 2;
type Comp4 = Comp3 | 3;
type VecLike<C extends string | number> = Readonly<Record<C, number>>;
type MatLike<C extends string | number> = Readonly<Record<`${C}${C}`, number>>;
export declare namespace WebGlLike {
	// uses ` & {}` and `interface` to prevent them collapsing.
	export type Float = number & {};
	export interface Float2 extends VecLike<Comp2> { }
	export interface Float3 extends VecLike<Comp3> { }
	export interface Float4 extends VecLike<Comp4> { }
	export interface FloatMat2 extends MatLike<Comp2> { }
	export interface FloatMat3 extends MatLike<Comp3> { }
	export interface FloatMat4 extends MatLike<Comp4> { }
	/**
	 * Different members of this union represent different webgl types.
	 */
	export type Value = (
		| Float
		| Float2
		| Float3
		| Float4
	);

}
// #endregion

export declare namespace WebGlType {
	export type Float = typeof WebGlType.Float;
	export type Float2 = typeof WebGlType.Float2;
	export type Float3 = typeof WebGlType.Float3;
	export type Float4 = typeof WebGlType.Float4;

	export type ValueType<T extends WebGlType> = (
		T extends WebGlType.Float ? WebGlLike.Float :
		T extends WebGlType.Float2 ? WebGlLike.Float2 :
		T extends WebGlType.Float3 ? WebGlLike.Float3 :
		T extends WebGlType.Float4 ? WebGlLike.Float4 :
		never
	);
}
// #endregion

export type Gl = WebGLRenderingContext;
export type GlUsage = (
	// | "STREAM_READ"
	// | "STREAM_COPY"
	// | "STATIC_READ"
	// | "STATIC_COPY"
	// | "DYNAMIC_READ"
	// | "DYNAMIC_COPY"
	| "STREAM_DRAW"
	| "STATIC_DRAW"
	| "DYNAMIC_DRAW"
);
export type GlTexture2DTarget = `TEXTURE_2D`;
export type GlTextureCubeTarget = `TEXTURE_CUBE_MAP_${`POSITIVE` | `NEGATIVE`}_${`X` | `Y` | `Z`}`;
export type GlTextureTarget =
	| GlTexture2DTarget
	| GlTextureCubeTarget;
export type GlTextureFormat = `RGB` | `RGBA` | `LUMINANCE_ALPHA` | `LUMINANCE` | `ALPHA`;
export type GlTextureType = `UNSIGNED_BYTE` | `UNSIGNED_SHORT_${`5_6_5` | `4_4_4_4` | `5_5_5_1`}`;
export type GlTextureSlot = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type GlTextureSource = ImageBitmap | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | OffscreenCanvas;

/** Basic information manager for a WebGL program. */
export class WebGlBase implements Disposable {
	readonly program: WebGLProgram;
	readonly uniformLocations: Map<string, WebGLUniformLocation | null> = new Map();
	readonly attribLocations: Map<string, GLint> = new Map();

	constructor(readonly gl: Gl, vertexShader: string, fragmentShader: string) {
		const vert = WebGlBase.createShader(gl, "VERTEX", vertexShader);
		const frag = WebGlBase.createShader(gl, "FRAGMENT", fragmentShader);
		this.program = WebGlBase.createProgram(gl, vert, frag);
	}

	// #region general stuff
	clear() {
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);
	}
	draw(count: number) {
		this.gl.useProgram(this.program);
		this.gl.drawArrays(this.gl.TRIANGLES, 0, count);
	}
	useProgram(): void { this.gl.useProgram(this.program); }

	dispose(): void {
		this.gl.deleteProgram(this.program);
		this.uniformLocations.clear();
		this.attribLocations.clear();
	}
	[Symbol.dispose](): void { this.dispose(); }
	// #endregion


	// #region uniform set

	/** Sets a `float` uniform. */
	setUniformF1(name: string, value: WebGlLike.Float): void {
		this.useProgram();
		const loc = this.getUniformLocation(name);
		this.gl.uniform1f(loc, value);
	}
	/** Sets a `vec2` uniform. */
	setUniformF2(name: string, value: WebGlLike.Float2): void {
		this.useProgram();
		const loc = this.getUniformLocation(name);
		this.gl.uniform2f(loc, value[0], value[1]);
	}
	/** Sets a `vec3` uniform. */
	setUniformF3(name: string, value: WebGlLike.Float3): void {
		this.useProgram();
		const loc = this.getUniformLocation(name);
		this.gl.uniform3f(loc, value[0], value[1], value[2]);
	}
	/** Sets a `vec4` uniform. */
	setUniformF4(name: string, value: WebGlLike.Float4): void {
		this.useProgram();
		const loc = this.getUniformLocation(name);
		this.gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
	}
	/** Sets a `mat2` uniform. */
	setUniformFMat2(name: string, value: WebGlLike.FloatMat2): void {
		this.useProgram();
		const loc = this.getUniformLocation(name);
		this.gl.uniformMatrix2fv(loc, false, [
			value["00"], value["01"],
			value["10"], value["11"],
		]);
	}
	/** Sets a `mat3` uniform. */
	setUniformFMat3(name: string, value: WebGlLike.FloatMat3): void {
		this.useProgram();
		const loc = this.getUniformLocation(name);
		this.gl.uniformMatrix3fv(loc, false, [
			value["00"], value["01"], value["02"],
			value["10"], value["11"], value["12"],
			value["20"], value["21"], value["22"],
		]);
	}
	/** Sets a `mat4` uniform. */
	setUniformFMat4(name: string, value: WebGlLike.FloatMat4): void {
		this.useProgram();
		const loc = this.getUniformLocation(name);
		this.gl.uniformMatrix4fv(loc, false, [
			value["00"], value["01"], value["02"], value["03"],
			value["10"], value["11"], value["12"], value["13"],
			value["20"], value["21"], value["22"], value["23"],
			value["30"], value["31"], value["32"], value["33"],
		]);
	}
	/** Sets a `sampler2D` uniform. */
	setUniformSampler2D(name: string, target: GlTexture2DTarget, slot: GlTextureSlot, texture: WebGLTexture): void {
		this.useProgram();
		const loc = this.getUniformLocation(name);
		this.setTextureSlot(texture, target, slot);
		this.gl.uniform1i(loc, slot);
	}
	// #endregion

	// #region buffer
	/** Fill a buffer with data. */
	setBuffer(buffer: WebGLBuffer, data: AllowSharedBufferSource, usage: GlUsage = "DYNAMIC_DRAW") {
		this.useProgram();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl[usage]);
	}
	/** Bind a buffer to an attribute. */
	setAttribBuffer(
		name: string, buffer: WebGLBuffer,
		type: WebGlType,
		normalized: GLboolean, stride: GLsizei, offset: GLintptr,
	) {
		this.useProgram();
		const index = this.getAttribLocation(name);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
		this.gl.enableVertexAttribArray(index);
		this.gl.vertexAttribPointer(index, type.size, this.gl[type.type], normalized, stride, offset);
	}
	// #endregion

	// #region texture
	createTexture(): WebGLTexture {
		return this.gl.createTexture();
	}
	setTexturePixels(
		texture: WebGLTexture,
		/** If `target` is `TEXTURE_CUBE_MAP_...`, will bind texture to `TEXTURE_CUBE_MAP` */
		target: GlTextureTarget,
		level: GLint,
		format: GlTextureFormat,
		width: GLsizei, height: GLsizei,
		border: GLint,
		type: GlTextureType,
		data: ArrayBufferView<ArrayBufferLike>,
	) {
		this.gl.bindTexture(this.toTextureBindTarget(target), texture);
		this.gl.texImage2D(this.gl[target], level, this.gl[format], width, height, border, this.gl[format], this.gl[type], data);
	}
	setTextureSource(
		texture: WebGLTexture,
		/** If `target` is `TEXTURE_CUBE_MAP_...`, will bind texture to `TEXTURE_CUBE_MAP` */
		target: GlTextureTarget,
		level: GLint,
		format: GlTextureFormat,
		type: GlTextureType,
		src: GlTextureSource,
	) {
		this.gl.bindTexture(this.toTextureBindTarget(target), texture);
		console.log([target], level, [format], [format], [type], src, (src as HTMLImageElement).complete);
		this.gl.texImage2D(this.gl[target], level, this.gl[format], this.gl[format], this.gl[type], src);
	}
	setTextureSlot(texture: WebGLTexture, target: GlTextureTarget, slot: GlTextureSlot): void {
		this.gl.activeTexture(this.gl[`TEXTURE${slot}`]);
		this.gl.bindTexture(this.toTextureBindTarget(target), texture);
	}
	/** Fill a texture with a single #f0f pixel. */
	setPlaceholderTexture(
		texture: WebGLTexture,
		target: `TEXTURE_${`2D` | `CUBE_MAP_${`POSITIVE` | `NEGATIVE`}_${`X` | `Y` | `Z`}`}`,
	) {
		this.setTexturePixels(
			texture, target,
			0,
			`RGB`,
			1, 1,
			0,
			`UNSIGNED_BYTE`,
			new Uint8Array([255, 0, 255, 255])
		);
	}

	private toTextureBindTarget(target: GlTextureTarget) {
		return target.startsWith("TEXTURE_CUBE_MAP") ? this.gl.TEXTURE_CUBE_MAP : this.gl[target];
	}
	// #endregion

	// #region location
	getUniformLocation(name: string): WebGLUniformLocation | null {
		return this.uniformLocations.getOrInsertComputed(name, name => {
			this.useProgram();
			return this.gl.getUniformLocation(this.program, name);
		});
	}
	getAttribLocation(name: string): GLint {
		return this.attribLocations.getOrInsertComputed(name, name => {
			this.useProgram();
			return this.gl.getAttribLocation(this.program, name);
		});
	}
	// #endregion


	// #region creation
	/**
	 * Creates and links a program with a vertex and fragment shader, then **deletes the shaders**.
	 * @throws if program creation/linking failed.
	 */
	static createProgram(gl: Gl, vert: WebGLShader, frag: WebGLShader): WebGLProgram {
		const program = gl.createProgram();
		if (program === null) throw new Error("Program creation failed.");
		gl.attachShader(program, vert);
		gl.attachShader(program, frag);
		gl.linkProgram(program);
		gl.deleteShader(vert);
		gl.deleteShader(frag);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const info = gl.getProgramInfoLog(program);
			gl.deleteProgram(program);
			throw new Error("Program linking failed", { cause: info });
		}
		return program;
	}
	/**
	 * Creates and compiles a vertex/fragment shader from a source string.
	 * @throws if shader creation/compilation failed.
	 */
	static createShader(gl: Gl, type: "VERTEX" | "FRAGMENT", src: string): WebGLShader {
		const shader = gl.createShader(gl[`${type}_SHADER`]);
		if (shader === null) throw new Error("Shader creation failed.");
		gl.shaderSource(shader, src);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const info = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw new Error("Shader compilation failed", { cause: info });
		}
		return shader;
	}
	// #endregion

	// #region sizeof
	/** Size of a (scalar) webgl value, in bytes. */
	static sizeofSingle(type: WebGlType["type"]): number {
		switch (type) {
			case "BYTE":
			case "UNSIGNED_BYTE":
				return 1;
			case "SHORT":
			case "UNSIGNED_SHORT":
				return 2;
			case "FLOAT":
				return 4;
		}
	}
	/** Size of a webgl value, in bytes. */
	static sizeof(type: WebGlType): number { return this.sizeofSingle(type.type) * type.size; }
	// #endregion
}