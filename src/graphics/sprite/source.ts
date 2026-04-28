import { Atlas } from "../atlas/atlas.js";
import { AtlasImage } from "../atlas/image.js";
import { Vector2 } from "../../utils/vector2.js";
import { parseXmlVector2, tryParseFloat } from "../../utils/parse.js";
import { SpriteAnimation } from "./animation.js";
import { chooserFromString } from "./chooser.js";
import { PlayerSprite } from "./player.js";
import { Sprite } from "./sprite.js";

/** Represents an `<Anim>` or `<Loop>` element in a spritesheet, parsed to a {@linkcode SpriteAnimation}. */
export class SpriteAnimationSource {
	constructor(
		readonly xml: Element,
		/** 
		 * The {@linkcode SpriteAnimation} this is associated with.
		 */
		readonly animation: SpriteAnimation,
	) { }

	static parse(xml: Element, sprite: Sprite, originalPath: string | null = null) {
		const atlas = sprite.atlas;
		const attr = xml.getAttribute.bind(xml);
		const thr0 = (msg: string) => { throw new Error(`Animation in sprite '${sprite.name}' ${msg}`); }

		const loop = xml.tagName === "Loop";
		const id = attr("id")
			?? thr0(`is missing [id].`);

		const thr = (msg: string) => { throw new Error(`Animation '${id}' in sprite '${sprite.name}' ${msg}`); }

		const relPath = attr("path") ?? "";
		const frametime = tryParseFloat(attr("delay")) ?? sprite.defaultFrametime;
		const framesAttr = attr("frames");
		const goto = attr("goto");

		const path = sprite.path + relPath;
		const frames = this.getIndexedFramesWithFallback(atlas, path, framesAttr, originalPath + relPath);

		const next = loop
			? () => id
			: goto
				? chooserFromString(goto, x => x)
				: () => null;

		const anim = new SpriteAnimation(
			id,
			frametime,
			frames,
			next,
			relPath,
			framesAttr,
		);

		const src = new SpriteAnimationSource(xml, anim);

		return src;
	}
	static getIndexedFramesWithFallback(atlas: Atlas, path: string, framesStr: string | null, fallbackPath: string | null): AtlasImage[] {
		const frames = this.getIndexedFrames(atlas, path, framesStr);
		if (fallbackPath === null || frames.length !== 0) return frames;
		return this.getIndexedFrames(atlas, fallbackPath, framesStr);
	}
	static getIndexedFrames(atlas: Atlas, path: string, framesAttr: string | null): AtlasImage[] {
		if (framesAttr === null || framesAttr === "") {
			return atlas.getSubimages(path);
		};
		const idxs = this.readCsvIntWithTricks(framesAttr);
		return this.getFrames(atlas, path, idxs);
	}
	static getFrames(atlas: Atlas, path: string, indices: number[]): AtlasImage[] {
		const thr = (msg: string) => { throw new Error(msg); };
		const subs = atlas.getSubimagesFor(path);
		if (!subs) return [];
		return indices.map(i => subs.get(i)
			?? thr(`Could not find frame #${i} in '${path}'`));
	}

	/** 
	 * Reads comma-seperated natural numbers.
	 * - `a-b` for an inclusive range  
	 *     e.g. `3-6` => `3,4,5,6`
	 * - `a*b` for repeated values  
	 *     e.g. `3*4` => `3,3,3,3`
	 * 
	 * (see `Calc.ReadCSVIntWithTricks` in `Monocle.Calc`)
	 */
	static readCsvIntWithTricks = (str: string): number[] => str.split(",").flatMap(seg => {
		if (seg.includes("-")) {
			const [a, b] = seg.split("-");
			const first = parseInt(a);
			const last = parseInt(b);
			const d = last - first;
			const sd = Math.sign(d);
			return Array.from({ length: Math.abs(d) + 1 }, (_, i) => first + i * sd);
		}
		if (seg.includes("*")) {
			const [a, b] = seg.split("*");
			const val = parseInt(a);
			const count = parseInt(b);
			return new Array<number>(count).fill(val);
		}
		return parseInt(seg);
	});
}

export type SpritePosition = (
	| { type: "offset"; offset: Vector2; }
	| { type: "justify"; justify: Vector2; }
);
/** Represents a sprite element in a spritesheet, adding data to a {@linkcode Sprite}. */
export class SpriteSource {
	constructor(
		readonly xml: Element,
		/** 
		 * The {@linkcode Sprite} this is associated with. Note that this `Sprite`
		 * may have been copied and its descendants will not see any edits.
		 */
		readonly sprite: Sprite,

		/**
		 * The starting animation of the {@linkcode Sprite}.
		 */
		readonly initialAnim: string | null,
		/**
		 * The default frametime of {@linkcode SpriteAnimation}s sourced from this.
		 */
		readonly defaultFrametime: number,
		/**
		 * The positioning of this {@linkcode Sprite} (offset/justified). If `null`, sprite defaults to an offset of `0, 0`.
		 */
		readonly position: SpritePosition | null,
		/**
		 * The animations this source contributed.
		 */
		readonly animations: SpriteAnimationSource[],
		/**
		 * The `<Metadata>` elements in the element (plus any copied metadata), which contains arbitrary information 
		 * (see {@linkcode PlayerSprite} for one use).
		 */
		readonly metadata: Element[],
	) { }

	/** Parses an XML element into a {@linkcode Sprite}, appending source info to it. */
	static parseInto(
		xml: Element,
		sprite: Sprite,
	) {
		const s = (msg?: string) => `Sprite '${sprite.name}' ${msg ?? ""}`;
		const thr = (err: string) => { throw new Error(err); };
		const thrs = (err: string) => { throw new Error(s(err)); };
		const attr = xml.getAttribute.bind(xml);
		const $ = xml.querySelector.bind(xml);
		const $$ = xml.querySelectorAll.bind(xml);

		const atlas = sprite.atlas;

		const originalPath = attr("path") ?? "";

		const initialAnim = attr("start");
		if (initialAnim !== null) {
			if (sprite.initialAnimation !== null) {
				console.warn(`Source for '%s' is overriding sprite's initial animation.`);
			}
			sprite.initialAnimation = initialAnim;
		}

		const defaultFrametime = tryParseFloat(attr("delay")) ?? 0;

		const Origin = $("Origin");
		const Justify = $("Justify");
		const Center = $("Center");
		const metadata = [...$$("Metadata")];

		const position = this.doPosition(sprite, Origin, Justify, Center);

		const animations = $$("Anim, Loop").values().map(el => SpriteAnimationSource.parse(el, sprite, originalPath)).toArray();
		animations.forEach(src => sprite.addAnimation(src.animation));

		const src = new SpriteSource(
			xml, sprite,
			initialAnim,
			defaultFrametime,
			position,
			animations,
			metadata,
		);
		sprite.sources.push(src);

		return src;
	}
	static doPosition(sprite: Sprite, Origin: Element | null, Justify: Element | null, Center: Element | null): SpritePosition | null {
		const s = (msg?: string) => `Sprite '${sprite.name}' ${msg ?? ""}`;

		if (Origin) {
			if (Justify || Center) {
				console.warn(s(`has both a <Origin> and <Justify> or <Center>. <Origin> will take priority.`));
			}
			const origin = parseXmlVector2(Origin);
			if (origin === null) {
				console.error(s(`has a malformed <Origin>.`));
				return null;
			} else {
				const offset = sprite.offset = origin.neg();
				return { type: "offset", offset };
			}
		} else if (Justify) {
			if (Center) {
				console.warn(s(`has both a <Justify> and <Center>. <Justify> will take priority.`));
			}
			const justify = parseXmlVector2(Justify);
			if (justify === null) {
				console.error(s(`has a malformed <Justify>.`));
				return null;
			} else {
				sprite.justify = justify;
				return { type: "justify", justify };
			}
		} else if (Center) {
			const justify = sprite.justify = new Vector2(.5);
			return { type: "justify", justify };
		}
		return null;
	}
}

const __ignore = () => PlayerSprite;
__ignore;