import { Vector2 } from "../utils/vector2.js";
import fallbackSrc from "../../assets/fallback-16.png";


const fallbackImg = new Image(32, 32);
fallbackImg.src = fallbackSrc;

export class Texture {
	readonly size = new Vector2(this.width, this.height);
	constructor(
		readonly source: HTMLCanvasElement | OffscreenCanvas | HTMLImageElement | ImageBitmap,
		readonly name: string,
		readonly width: number = source.width,
		readonly height: number = source.height,
	) { }

	static readonly FALLBACK = new Texture(fallbackImg, "FALLBACK");
}