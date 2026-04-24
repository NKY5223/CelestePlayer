export class Vector2 {
	constructor(readonly x: number = 0, readonly y: number = x) { }
	
	add(v: Vector2): Vector2 { return new Vector2(this.x + v.x, this.y + v.y); }
	mul(v: Vector2): Vector2 { return new Vector2(this.x * v.x, this.y * v.y); }
	scale(c: number): Vector2 { return new Vector2(c * this.x, c * this.y); }
	neg(): Vector2 { return new Vector2(-this.x, -this.y); }
	
	toString(): string {
		return `${this.x},${this.y}`;
	}

	static readonly ZERO = new Vector2(0);
	static readonly ONE = new Vector2(1);
}