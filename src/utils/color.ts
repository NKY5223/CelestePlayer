import { WebGlLike } from "../graphics/webgl/base.js";

export type ColorSource = never;

/** A [0, 1]-normalized color in sRGB space. */
export class Color implements WebGlLike.Float4 {
	constructor(
		readonly r: number,
		readonly g: number,
		readonly b: number,
		readonly a: number = 1,
		readonly src: ColorSource | null = null
	) { }
	readonly 0 = this.r;
	readonly 1 = this.g;
	readonly 2 = this.b;
	readonly 3 = this.a;

	toString(): string {
		return `Color(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
	}

	static fromHex(hex: number, a: number = 1): Color {
		const r = (hex >> 16) & 0xff;
		const g = (hex >> 8) & 0xff;
		const b = (hex >> 0) & 0xff;
		return new Color(r / 0xff, g / 0xff, b / 0xff, a);
	}

	static readonly WHITE = new Color(1, 1, 1, 1);
}
