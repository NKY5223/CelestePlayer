import { Vector2 } from "../utils/vector2.js";


const fallbackImg = new Image(32, 32);
// ./assets/fallback.png
fallbackImg.src = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABTklEQVR4AeyWsYrCQBCG5+4BrkqfPMbBvdjB1QepLKx9Bkt9AkGs7LVIQAXRShBL9Q9ZWcVZZyYbtFD4d3ZnszOf/6bIJz359wZgHSiK4miR9kZZABRK05Q0whlAI0oVBJAW8Z8DsAYiOgBgNBCtAGggWgOQQkQHKMuSfAEk9E5EBcDd3xMgOEUF4JqE8m+ARg7k823IXdFeIwB0yGcbBLMaAyTDpbk5DpoBOpMFJYMFalCvO62iZTADfI2v79/6PpgB/H+7+04ubvh5yVwNAOtdYTSGbt1w+5KoAkBzNHN3jjnkGrm8W0uiCsBvxhUHJLd3Ly8GQOH1al/VgO3V5Dwg53ReEiA1TogA/n9HdOiXqE9ohjkiVCXrAWsnnKnTwSAC+Mt/yKJg53pTBFA/20p4bQD/06rJPGQd60CWZR8xxUGwANyB2PnWAR4BnwAAAP//JGtonAAAAAZJREFUAwCAHfhBknv3xQAAAABJRU5ErkJggg==`;

export class AtlasTexture {
	readonly size = new Vector2(this.width, this.height);
	constructor(
		readonly source: HTMLCanvasElement | OffscreenCanvas | HTMLImageElement | ImageBitmap,
		readonly name: string,
		readonly width: number = source.width,
		readonly height: number = source.height,
	) { }

	static readonly FALLBACK = new AtlasTexture(fallbackImg, "FALLBACK");
}