import { Atlas } from "../atlas/atlas.js";
import { AtlasImage } from "../atlas/image.js";
import { Vector2 } from "../utils/vector2.js";
import { Sprite } from "./sprite.js";

type Animation = Sprite.Animation;

export class SpriteBank {
	constructor(readonly sprites: Map<string, Sprite>) { }

	get(name: string): Sprite | undefined { return this.sprites.get(name); }

	private static readonly parser = new DOMParser();
	static async readFromUrl(atlas: Atlas, url: string): Promise<SpriteBank> {
		const res = await fetch(url);
		const xml = await res.text();
		const doc = this.parser.parseFromString(xml, "application/xml");
		return SpriteBank.readXml(doc, atlas);
	}

	static readXml(doc: Document, atlas: Atlas) {
		const root = doc.documentElement;
		if (root.tagName !== "Sprites") {
			throw new Error(`Expected sprite xml to have <Sprites> as root, but received <${root.tagName}>`);
		}

		const sprites = new Map<string, Sprite>();
		[...root.children].forEach(el => {
			const sprite = this.parseSprite(atlas, el, sprites);
			sprites.set(sprite.name, sprite);
		});
		return new SpriteBank(sprites);
	}
	static parseSprite(atlas: Atlas, el: Element, sprites: Map<string, Sprite>) {
		const name = el.tagName;
		const s = (msg?: string) => `Sprite '${name}' ${msg ?? ""}`;
		const thr = (err: string) => { throw new Error(s(err)); };
		const attr = el.getAttribute.bind(el);
		const qs = el.querySelector.bind(el);
		const qsa = el.querySelectorAll.bind(el);

		const rootPath = attr("path") ?? "";
		const copy = attr("copy");
		const start = attr("start");
		const delayFB = this.tryParseFloat(attr("delay")) ?? 0;

		const copySprite = copy === null ? null : (sprites.get(copy)
			?? thr(`tries to [copy] a nonexistent (possible further down) sprite.`));

		const sprite = copySprite?.clone({ name, start }) ?? new Sprite(name, new Map(), start);

		const Origin = qs("Origin");
		const Justify = qs("Justify");
		const Center = qs("Center");

		if (Origin) {
			if (Justify || Center) {
				console.warn(s(`has both a <Origin> and <Justify> or <Center>. <Origin> will take priority.`));
			}
			const origin = this.parseVector2(Origin);
			if (origin === null) {
				console.error(s(`has a malformed <Origin>.`));
			} else {
				sprite.offset = origin.neg();
			}
		} else if (Justify) {
			if (Center) {
				console.warn(s(`has both a <Justify> and <Center>. <Justify> will take priority.`));
			}
			const justify = this.parseVector2(Justify);
			if (justify === null) {
				console.error(s(`has a malformed <Justify>.`));
			} else {
				sprite.justify = justify.neg();
			}
		} else if (Center) {
			sprite.justify = new Vector2(.5);
		}

		if (copySprite) {
			for (const src of copySprite.animations.values()) {
				const anim = this.transferAnimation(atlas, src, rootPath);
				if (!anim) continue;
				sprite.addAnimation(anim);
			}
		}

		for (const el of qsa("Anim, Loop")) {
			try {
				sprite.addAnimation(this.parseAnimation(atlas, el, delayFB, rootPath, thr));
			} catch (err) {
				console.error("Error parsing animation:", err);
			}
		}

		return sprite;
	}
	static parseAnimation(atlas: Atlas, el: Element, delayFB: number, rootPath: string, thr: (err: string) => never): Animation {
		const attr = el.getAttribute.bind(el);

		const loop = el.tagName === "Loop";
		const id = attr("id")
			?? thr(`has an animation with missing [id].`);
		const relPath = attr("path") ?? "";
		const delay = this.tryParseFloat(attr("delay")) ?? delayFB;
		const framesAttr = attr("frames");
		const goto = attr("goto");

		const path = rootPath + relPath;
		const frames = this.getIndexedFrames(atlas, path, framesAttr);

		const next = loop
			? () => id
			: () => goto;
		return {
			id,
			path: relPath,
			frametime: delay,
			frames,
			frameIndices: framesAttr,
			next,
		};
	}
	static transferAnimation(atlas: Atlas, src: Animation, rootPath: string): Animation | null {
		try {
			const frames = this.getIndexedFrames(atlas, (rootPath + src.path), src.frameIndices);
			return {
				...src,
				frames,
			};
		} catch (err) {
			return null;
		}
	}

	static getIndexedFrames(atlas: Atlas, path: string, framesAttr: string | null): AtlasImage[] {
		if (framesAttr === null || framesAttr === "") {
			const all = atlas.getSubimagesSorted(path);
			return all.map(([_, path]) => path);

		};
		const idxs = this.readCsvIntWithTricks(framesAttr);
		return this.getFrames(atlas, path, idxs);
	}
	static getFrames(atlas: Atlas, path: string, indices: number[]): AtlasImage[] {
		const thr = (msg: string) => { throw new Error(msg); };
		return indices.map(i => atlas.getSubimage(path, i)
			?? thr(`Could not find frame #${i} in '${path}'`));
	}

	static parseVector2 = (el: Element): Vector2 | null => {
		const x = this.tryParseFloat(el.getAttribute("x"));
		if (x === null) return null;
		const y = this.tryParseFloat(el.getAttribute("y"));
		if (y === null) return null;
		return new Vector2(x, y);
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
	static readCsvIntWithTricks = (str: string): number[] => str
		.split(",")
		.flatMap(seg => {
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

	/** Tries to parse `str` as a number. Will return `null` instead of `NaN`. */
	static tryParseFloat = (str: string | null): number | null => {
		if (str === null) return null;
		const n = parseFloat(str);
		if (isNaN(n)) return null;
		return n;
	}
}