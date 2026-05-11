import { WebGlLike } from "../graphics/webgl/base.js";

/** A 2d column vector. */
export class Vector2 implements WebGlLike.Float2 {
	constructor(
		readonly x: number = 0,
		readonly y: number = x,
	) { }
	get 0() { return this.x; }
	get 1() { return this.y; }

	add(v: Vector2): Vector2 { return new Vector2(this.x + v.x, this.y + v.y); }
	mul(v: Vector2): Vector2 { return new Vector2(this.x * v.x, this.y * v.y); }
	scale(c: number): Vector2 { return new Vector2(c * this.x, c * this.y); }
	neg(): Vector2 { return new Vector2(-this.x, -this.y); }
	dot(v: Vector2): number { return this.x * v.x + this.y * v.y; }

	/** Returns a vector with just the x component of this one. */
	justX(): Vector2 { return new Vector2(this.x, 0); }
	/** Returns a vector with just the y component of this one. */
	justY(): Vector2 { return new Vector2(0, this.y); }

	toString(): string {
		return `(${this.x}, ${this.y})`;
	}

	static readonly ZERO = new Vector2(0);
	static readonly ONE = new Vector2(1);
	static readonly X = new Vector2(1, 0);
	static readonly Y = new Vector2(0, 1);

	static isVector2(value: unknown): value is Vector2 { return value instanceof Vector2; }
}
/** A 3d column vector. */
export class Vector3 implements WebGlLike.Float3 {
	constructor(
		readonly x: number = 0,
		readonly y: number = x,
		readonly z: number = x,
	) { }
	get 0() { return this.x; }
	get 1() { return this.y; }
	get 2() { return this.z; }

	add(v: Vector3): Vector3 { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
	mul(v: Vector3): Vector3 { return new Vector3(this.x * v.x, this.y * v.y, this.z * v.z); }
	scale(c: number): Vector3 { return new Vector3(c * this.x, c * this.y, c * this.z); }
	neg(): Vector3 { return new Vector3(-this.x, -this.y, -this.z); }
	dot(v: Vector3): number { return this.x * v.x + this.y * v.y + this.z * v.z; }

	toString(): string {
		return `(${this.x}, ${this.y}, ${this.z})`;
	}

	static readonly ZERO = new Vector3(0);
	static readonly ONE = new Vector3(1);
	static readonly X = new Vector3(1, 0, 0);
	static readonly Y = new Vector3(0, 1, 0);
	static readonly Z = new Vector3(0, 0, 1);

	static isVector3(value: unknown): value is Vector3 { return value instanceof Vector3; }
}
/** A 4d column vector. */
export class Vector4 implements WebGlLike.Float4 {
	constructor(
		readonly x: number = 0,
		readonly y: number = x,
		readonly z: number = x,
		readonly w: number = x,
	) { }
	get 0() { return this.x; }
	get 1() { return this.y; }
	get 2() { return this.z; }
	get 3() { return this.w; }

	add(v: Vector4): Vector4 { return new Vector4(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w); }
	mul(v: Vector4): Vector4 { return new Vector4(this.x * v.x, this.y * v.y, this.z * v.z, this.w * v.w); }
	scale(c: number): Vector4 { return new Vector4(c * this.x, c * this.y, c * this.z, c * this.w); }
	neg(): Vector4 { return new Vector4(-this.x, -this.y, -this.z, -this.w); }
	dot(v: Vector4): number { return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w; }

	toString(): string {
		return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
	}

	static readonly ZERO = new Vector4(0);
	static readonly ONE = new Vector4(1);
	static readonly X = new Vector4(1, 0, 0, 0);
	static readonly Y = new Vector4(0, 1, 0, 0);
	static readonly Z = new Vector4(0, 0, 1, 0);
	static readonly W = new Vector4(0, 0, 0, 1);

	static isVector4(value: unknown): value is Vector4 { return value instanceof Vector4; }
}

/** A 2x2 matrix, represented by its columns. */
export class Matrix2 implements WebGlLike.FloatMat2 {
	constructor(
		readonly x: Vector2,
		readonly y: Vector2,
	) { }
	get "00"() { return this.x.x; }
	get "01"() { return this.x.y; }
	get "10"() { return this.y.x; }
	get "11"() { return this.y.y; }

	add(m: Matrix2): Matrix2 { return new Matrix2(this.x.add(m.x), this.y.add(m.y)); }
	mulVec(v: Vector2): Vector2 { return this.x.scale(v.x).add(this.y.scale(v.y)); }
	/** In the order `this` · `m`. */
	mulMatLeft(m: Matrix2): Matrix2 { return new Matrix2(this.mulVec(m.x), this.mulVec(m.y)); }
	scale(c: number): Matrix2 { return new Matrix2(this.x.scale(c), this.y.scale(c)); }
	neg(): Matrix2 { return new Matrix2(this.x.neg(), this.y.neg()); }
}
/** A 4x4 matrix, represented by its columns. */
export class Matrix4 implements WebGlLike.FloatMat4 {
	constructor(
		readonly x: Vector4,
		readonly y: Vector4,
		readonly z: Vector4,
		readonly w: Vector4,
	) { }
	get "00"() { return this.x.x; }
	get "01"() { return this.x.y; }
	get "02"() { return this.x.z; }
	get "03"() { return this.x.w; }
	get "10"() { return this.y.x; }
	get "11"() { return this.y.y; }
	get "12"() { return this.y.z; }
	get "13"() { return this.y.w; }
	get "20"() { return this.z.x; }
	get "21"() { return this.z.y; }
	get "22"() { return this.z.z; }
	get "23"() { return this.z.w; }
	get "30"() { return this.w.x; }
	get "31"() { return this.w.y; }
	get "32"() { return this.w.z; }
	get "33"() { return this.w.w; }

	add(m: Matrix4): Matrix4 {
		return new Matrix4(
			this.x.add(m.x),
			this.y.add(m.y),
			this.z.add(m.z),
			this.w.add(m.w),
		);
	}
	mulVec(v: Vector4): Vector4 {
		return (
			this.x.scale(v.x)
				.add(this.y.scale(v.y))
				.add(this.z.scale(v.z))
				.add(this.w.scale(v.w))
		);
	}
	/** In the order `this` · `m`. */
	mulMat(m: Matrix4): Matrix4 {
		return new Matrix4(
			this.mulVec(m.x),
			this.mulVec(m.y),
			this.mulVec(m.z),
			this.mulVec(m.w),
		);
	}
	scale(c: number): Matrix4 {
		return new Matrix4(
			this.x.scale(c),
			this.y.scale(c),
			this.z.scale(c),
			this.w.scale(c),
		);
	}
	neg(): Matrix4 {
		return new Matrix4(
			this.x.neg(),
			this.y.neg(),
			this.z.neg(),
			this.w.neg(),
		);
	}

	static diag(diagonal: Vector4): Matrix4;
	static diag(x: number, y: number, z: number, w: number): Matrix4;
	static diag(x: number | Vector4, y?: number, z?: number, w?: number): Matrix4 {
		if (Vector4.isVector4(x)) {
			return Matrix4.diag(x.x, x.y, x.z, x.w);
		}
		return new Matrix4(
			new Vector4(x, 0, 0, 0),
			new Vector4(0, y, 0, 0),
			new Vector4(0, 0, z, 0),
			new Vector4(0, 0, 0, w),
		);
	}

	/** A translation matrix (for homogeneous coordinates). */
	static translate(by: Vector3): Matrix4;
	static translate(x: number, y: number, z: number): Matrix4;
	static translate(x: number | Vector3, y?: number, z?: number): Matrix4 {
		if (Vector3.isVector3(x)) {
			return Matrix4.translate(x.x, x.y, x.z);
		}
		return new Matrix4(
			new Vector4(1, 0, 0, 0),
			new Vector4(0, 1, 0, 0),
			new Vector4(0, 0, 1, 0),
			new Vector4(x, y, z, 1),
		);
	}
}