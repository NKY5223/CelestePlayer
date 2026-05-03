import { Vector2 } from "./vector.js";

/** An *axis-aligned* rectangle, defined by its left, right, top and bottom edges. */
export class Rectangle {
	readonly width = this.right - this.left;
	readonly height = this.bottom - this.top;
	readonly size = new Vector2(this.width, this.height);
	constructor(readonly left: number, readonly right: number, readonly top: number, readonly bottom: number) { }

	static fromSize(x: number, y: number, width: number, height: number): Rectangle {
		return new Rectangle(x, x + width, y, y + height);
	}

	/** Returns `true` iff point is in rectangle or on its boundary. */
	contains(x: number, y: number): boolean {
		return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
	}
}