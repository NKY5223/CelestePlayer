import { WebGlLike } from "../graphics/webgl/base.js";

export type ColorSource = never;

/** A [0, 1]-normalized color in sRGB space. */
export class Color implements WebGlLike.Float4 {
	readonly 0: number;
	readonly 1: number;
	readonly 2: number;
	readonly 3: number;
	constructor(
		readonly r: number,
		readonly g: number,
		readonly b: number,
		readonly a: number = 1,
		readonly src: ColorSource | null = null
	) {
		this[0] = this.r;
		this[1] = this.g;
		this[2] = this.b;
		this[3] = this.a;
	}

	toHexString(): string {
		const r = Math.trunc(this.r * 0xff).toString(16).padStart(2, "0");
		const g = Math.trunc(this.g * 0xff).toString(16).padStart(2, "0");
		const b = Math.trunc(this.b * 0xff).toString(16).padStart(2, "0");
		return ``;
	}
	toString(): string {
		return `Color(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
	}

	static fromHex(hex: number, a: number = 1): Color {
		const r = (hex >> 16) & 0xff;
		const g = (hex >> 8) & 0xff;
		const b = (hex >> 0) & 0xff;
		return new Color(r / 0xff, g / 0xff, b / 0xff, a);
	}
	static fromString(str: string): Color {
		const rgb = str.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?/i);
		console.log(rgb);
		return Color.TRANSPARENT_BLACK;
	}

	static readonly WHITE = new Color(1, 1, 1, 1);
	static readonly TRANSPARENT_BLACK = new Color(0, 0, 0, 0);
}
