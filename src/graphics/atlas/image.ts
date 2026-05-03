import { Rectangle } from "../../utils/rectangle.js";
import { Vector2 } from "../../utils/vector.js";
import { Texture } from "./texture.js";

/** The equivalent of Monocle's `MTexture`, specifically for atlas images. */
export class AtlasImage {
	constructor(
		/** texture source */
		readonly texture: Texture,
		/** name of image */
		readonly path: string,
		/** uv coordinates of image in texture (integer pixel position) */
		readonly uv: Rectangle = new Rectangle(0, texture.width, 0, texture.height),
		/** Offset image */
		readonly offset: Vector2 = Vector2.ZERO,
		/** Image size (only really matters when drawn justified/centered by a `Sprite`) */
		readonly size: Vector2 = texture.size,
	) { }

	draw2d(ctx: CanvasRenderingContext2D, pos: Vector2) {
		ctx.drawImage(this.texture.source,
			this.uv.left, this.uv.top,
			this.uv.width, this.uv.height,
			pos.x + this.offset.x,
			pos.y + this.offset.y,
			this.uv.width, this.uv.height,
		);
	}
	draw2dScaled(ctx: CanvasRenderingContext2D, pos: Vector2, scale: Vector2) {
		ctx.drawImage(this.texture.source,
			this.uv.left, this.uv.top,
			this.uv.width, this.uv.height,
			pos.x + scale.x * this.offset.x,
			pos.y + scale.y * this.offset.y,
			scale.x * this.uv.width, scale.y * this.uv.height,
		);
	}

	static readonly FALLBACK = new AtlasImage(
		Texture.FALLBACK,
		"__fallback",
	);

	toString() {
		return `AtlasImage('${this.path}', ${this.size.x}×${this.size.y})`;
	}
};	
