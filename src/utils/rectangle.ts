import { Vector2 } from "./vector.js";

/** An *axis-aligned* rectangle, defined by its left, right, top and bottom edges. */
export class Rectangle {
	readonly width: number;
	readonly height: number;
	readonly size: Vector2;
	constructor(readonly left: number, readonly right: number, readonly top: number, readonly bottom: number) {
		this.width = this.right - this.left;
		this.height = this.bottom - this.top;
		this.size = new Vector2(this.width, this.height);
	}

	static fromSize(x: number, y: number, width: number, height: number): Rectangle {
		return new Rectangle(x, x + width, y, y + height);
	}

	get topLeft(): Vector2 { return new Vector2(this.left, this.top); }
	get topRight(): Vector2 { return new Vector2(this.right, this.top); }
	get bottomLeft(): Vector2 { return new Vector2(this.left, this.bottom); }
	get bottomRight(): Vector2 { return new Vector2(this.right, this.bottom); }

	/** Returns `true` iff point is in rectangle or on its boundary. */
	contains(x: number, y: number): boolean {
		return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
	}
}