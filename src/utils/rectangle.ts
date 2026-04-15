/** An *axis-aligned* rectangle. */
export class Rectangle {
	constructor(readonly left: number, readonly right: number, readonly top: number, readonly bottom: number) { }
	static fromSize(x: number, y: number, width: number, height: number): Rectangle {
		return new Rectangle(x, x + width, y, y + height);
	}
}