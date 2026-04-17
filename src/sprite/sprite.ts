import { Atlas, AtlasImage } from "../atlas/atlas.js";

export namespace Sprite {
	export type Animation = {
		id: string;
		delay: number;
		frames: AtlasImage[];
		next: () => string;
	};
}
type Animation = Sprite.Animation;

export class Sprite {
	constructor(
		readonly name: string,
		readonly animations: Animation[],
	) { }

	private static readonly parser = new DOMParser();
	static async readXml(atlas: Atlas, url: string) {
		const res = await fetch(url);
		const xml = await res.text();
		const doc = this.parser.parseFromString(xml, "application/xml");
		console.log({ doc });

		const root = doc.documentElement;
		if (root.tagName !== "Sprites") {
			throw new Error(`Expected sprite xml to have <Sprites> as root, but received <${root.tagName}>`);
		}

		const sprites = [...root.children].map(el => this.parseSprite(atlas, el));
		console.log(sprites);
		return sprites;
	}

	static parseSprite(atlas: Atlas, el: Element) {
		const name = el.tagName;
		const s = (msg?: string) => `Sprite '${name}' ${msg ?? ""}`;
		const thr = (err: string) => { throw new Error(s(err)); };
		const attr = el.getAttribute.bind(el);
		const qs = el.querySelector.bind(el);
		const qsa = el.querySelectorAll.bind(el);

		const rootPath = attr("path") ?? "";

		const start = attr("start");

		const Origin = qs("Origin");
		const Justify = qs("Justify");
		const Center = qs("Center");

		const delayFB = this.tryParseFloat(attr("delay")) ?? 0;

		const Anims = qsa("Anim, Loop");
		const anims = [...Anims].map<Animation | null>(el => {
			try {
				const attr = el.getAttribute.bind(el);
				const qs = el.querySelector.bind(el);
				const qsa = el.querySelectorAll.bind(el);

				const loop = el.tagName === "Loop";
				const id = attr("id")
					?? thr(`has an animation with missing [id].`);
				const relPath = attr("path") ?? "";
				const delay = this.tryParseFloat(attr("delay")) ?? delayFB;
				const framesAttr = attr("frames");
				const goto = attr("goto");

				const path = rootPath + relPath;
				const frames = this.getFramePaths(atlas, path, framesAttr);

				const next = loop
					? () => id
					: goto !== null ? () => goto : () => id;
				return {
					id,
					next,
					delay,
					frames,
				};
			} catch (err) {
				console.error("Error parsing animation:", err);
				return null;
			}
		});

		return new Sprite(
			name,
			anims.filter(a => a !== null),
		);
	}

	static getFramePaths(atlas: Atlas, path: string, framesAttr: string | null): AtlasImage[] {
		const all = atlas.images.entries()
			.filter(([k, _]) => k.toLowerCase().startsWith(path.toLowerCase()))
			.map(([k, v]) => [+k.slice(path.length), v] as const)
			.filter(([n, _]) => isFinite(n))
			.toArray()
			.sort(([a, _], [b, __]) => a - b);
		if (framesAttr === null) return all.map(([_, path]) => path);
		const idxs = this.readCsvIntWithTricks(framesAttr);
		const allMap = new Map(all);
		return idxs.map(i => allMap.get(i) ?? (() => { throw new Error(`Missing frame ${i} in ${path}`) })());
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
	static readCsvIntWithTricks = (str: string): number[] =>
		str.split(",").flatMap(seg => {
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