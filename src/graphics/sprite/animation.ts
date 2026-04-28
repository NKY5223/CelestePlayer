import { Atlas } from "../atlas/atlas.js";
import { AtlasImage } from "../atlas/image.js";
import { tryParseFloat } from "../../utils/parse.js";
import { chooserFromString } from "./chooser.js";
import { Sprite } from "./sprite.js";

/** 
 * A series of frames in an animation for a {@linkcode Sprite}.
 * 
 * NOTE: Is named `SpriteAnimation` because {@linkcode Animation} is already in the DOM library.
 */
export class SpriteAnimation {
	constructor(
		readonly id: string,
		/** Time a frame should play before the next, in seconds. */
		readonly frametime: number,
		/** Array of frame images. */
		readonly frames: AtlasImage[],
		/** Animation to play after this one ends. Return `id` to loop. Return `null` to stop. */
		readonly next: () => string | null,

		// For transferring animations to other sprites
		/** Path of animation textures (relative) */
		readonly path: string,
		/** 
		 * STRING of frame indices (e.g. `0,1` => /player/walk00, /player/walk01)
		 * Why is this a string? Because `characters/player_no_backpack/idle` only goes up to 7, 
		 * while `characters/player/idle` goes up to 8!!!!!!!!! how wonderful!!!!
		 */
		readonly frameIndices: string | null,
	) { }

	transfer(sprite: Sprite): SpriteAnimation {
		return SpriteAnimation.transferTo(this, sprite) ?? this;
	}

	clone(override: Partial<SpriteAnimation> = {}) {
		const {
			id,
			frametime, frames,
			next,
			path,
			frameIndices,
		} = override;
		const anim = new SpriteAnimation(
			id ?? this.id,
			frametime ?? this.frametime,
			frames ?? [...this.frames],
			next ?? this.next,
			path ?? this.path,
			frameIndices ?? this.frameIndices,
		);
		return anim;
	}

	static parseXml(sprite: Sprite, el: Element): SpriteAnimation {
		const atlas = sprite.atlas;
		const attr = el.getAttribute.bind(el);
		const thr0 = (msg: string) => { throw new Error(`Animation in sprite '${sprite.name}' ${msg}`); }

		const loop = el.tagName === "Loop";
		const id = attr("id")
			?? thr0(`is missing [id].`);

		const thr = (msg: string) => { throw new Error(`Animation '${id}' in sprite '${sprite.name}' ${msg}`); }

		const relPath = attr("path") ?? "";
		const frametime = tryParseFloat(attr("delay")) ?? sprite.defaultFrametime;
		const framesAttr = attr("frames");
		const goto = attr("goto");

		const path = sprite.path + relPath;
		const frames = this.getIndexedFrames(atlas, path, framesAttr);

		const next = loop
			? () => id
			: goto
				? chooserFromString(goto, x => x)
				: () => null;
		return new SpriteAnimation(
			id,
			frametime,
			frames,
			next,
			relPath,
			framesAttr,
		);
	}
	static transferTo(src: SpriteAnimation, sprite: Sprite): SpriteAnimation | null {
		try {
			const frames = this.getIndexedFrames(sprite.atlas, (sprite.path + src.path), src.frameIndices);
			if (frames.length === 0) {
				// console.warn(`Animation '%s' (copying %o at '%s') got 0 frames.`, src.id, src, rootPath);
				return src.clone();
			}
			return src.clone({ frames });
		} catch (err) {
			return null;
		}
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
};