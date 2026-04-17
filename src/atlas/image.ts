import { Rectangle } from "../utils/rectangle.js";
import { Vector2 } from "../utils/vector2.js";

export type AtlasTexture = {
	name: string;
	width: number;
	height: number;
	image: CanvasImageSource;
};

export class AtlasImage {
	constructor(
		/** texture source */
		readonly texture: AtlasTexture,
		/** name of image */
		readonly path: string,
		/** uv coordinates of image in texture (integer pixel position) */
		readonly uv: Rectangle,
		/** Offset image */
		readonly offset: Vector2,
		/** Image size (only matters when drawn justified/centered) */
		readonly size: Vector2,
	) { }

	draw2d(ctx: CanvasRenderingContext2D, pos: Vector2) {
		// inefficient but can inline after done with debugging
		this.draw2dScaled(ctx, pos, 1);
	}
	draw2dScaled(ctx: CanvasRenderingContext2D, pos: Vector2, scale: number) {
		ctx.drawImage(this.texture.image,
			this.uv.left, this.uv.top,
			this.uv.width, this.uv.height,
			pos.x + scale * this.offset.x,
			pos.y + scale * this.offset.y,
			scale * this.uv.width, scale * this.uv.height,
		);
	}

	static fallbackTexture: AtlasTexture = {
		name: "FALLBACK",
		width: 1,
		height: 1,
		image: new OffscreenCanvas(1, 1),
	};
	static fallback = new AtlasImage(
		this.fallbackTexture,
		"__fallback",
		new Rectangle(0, 0, 1, 1),
		new Vector2(0, 0),
		new Vector2(1, 1),
	);
};	
