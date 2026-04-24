import { zipDefault } from "../utils/array.js";
import { parseVector2, tryParseInt } from "../utils/parse.js";
import { Vector2 } from "../utils/vector2.js";
import { Sprite } from "./sprite.js";

export type PlayerFrameData = {
	/** `null` means hair should not be drawn. */
	readonly hairOffset: Vector2 | null;
	readonly carryYOffset?: number;
	readonly bangsFrame: number;
};
export class PlayerSprite {
	readonly frameData: Map<string, PlayerFrameData>;
	constructor(
		readonly sprite: Sprite
	) {
		const data = sprite.metadata
			.values()
			.flatMap(el => [...el.querySelectorAll("Frames")])
			.flatMap(xml => PlayerSprite.parseFrames(xml, sprite));
		this.frameData = new Map(data);
	}

	get currentData() {
		return this.frameData.get(this.sprite.image.path);
	}
	/** `null` means hair should not be drawn now. */
	get hairOffset() {
		return this.currentData?.hairOffset ?? null;
	}
	get bangsFrame() {
		return this.currentData?.bangsFrame ?? 0;
	}
	get carryYOffset() {
		return (this.currentData?.carryYOffset ?? 0);
	}

	static parseFrames(xml: Element, sprite: Sprite) {
		const path = sprite.path + (xml.getAttribute("path") ?? "");
		const hairs = (xml.getAttribute("hair") ?? "").split("|");
		const carries = (xml.getAttribute("carry") ?? "").split(",");
		return zipDefault(hairs, carries, null, null)
			.entries()
			.map(([i, [hair, carry]]) => {
				const frame = sprite.atlas.getSubimage(path, i);
				if (!frame) return null;
				const data: PlayerFrameData = {
					...this.parseHair(hair),
					carryYOffset: tryParseInt(carry) ?? undefined,
				};
				return [frame.path, data] as const;
			})
			.filter(x => !!x);
	}
	static parseHair(str: string | null): Pick<PlayerFrameData, "hairOffset" | "bangsFrame"> {
		if (str === null) return { hairOffset: null, bangsFrame: 0 };
		const [offset, frame] = str.split(":");
		return {
			hairOffset: parseVector2(offset),
			bangsFrame: tryParseInt(frame) ?? 0,
		};
	}
}