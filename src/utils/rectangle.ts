/** An *axis-aligned* rectangle. */
export class Rectangle {
	width = this.right - this.left;
	height = this.bottom - this.top;
	constructor(readonly left: number, readonly right: number, readonly top: number, readonly bottom: number) { }

	static fromSize(x: number, y: number, width: number, height: number): Rectangle {
		return new Rectangle(x, x + width, y, y + height);
	}

	/** Returns `true` iff point is in rectangle or on its boundary. */
	contains(x: number, y: number): boolean {
		return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
	}
}