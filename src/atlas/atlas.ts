import { Rectangle } from "../utils/rectangle.js";
import type { AtlasMetaIn, AtlasMetaOut, AtlasMetaTexture } from "./meta.worker.js";
import type { AtlasDataIn, AtlasDataOut, AtlasDataReadInfo } from "./data.worker.js";
import { AtlasImage, AtlasTexture } from "./image.js";
import { Vector2 } from "../utils/vector2.js";

/** 
 * Atlas images, grouped by names. Only use for displaying data.
 * @example
 * ""
 * ├ characters
 * │ ├ player
 * │ │ ├ idle01 - <image>
 * │ │ └ ...
 * │ ├ player_badeline
 * │ │ ├ idle01 - <image>
 * │ │ └ ...
 * │ └ ...
 * └ ...
 */
export type AtlasNameTree = {
	/** Current node name, e.g. `"decal/forsaken/1-sign"` */
	name: string;
	/** Children of current node. If undefined, this node has no children. */
	children?: Map<string, AtlasNameTree>;
	/** Image associated with this node. */
	image?: AtlasImage;
};
export class Atlas {
	/** DO NOT MODIFY */
	readonly images: Map<string, AtlasImage>;
	/** 
	 * contains *lowercase* ids, because celeste is WEIRD and 
	 * uses case-insensitive `Dictionary`s for subtextures
	 * JAVASCRIPT DOES NOT HAVE THIS FEATURE 
	 * i get that they bundled it from windows but you can RENAME the file,,, please,,,
	 * 
	 * at least `.toLowerCase()` is essentially a map from `string` to 
	 * its quotient over case-insensitive equality
	 */
	readonly subimages: Map<string, Map<number, AtlasImage>>;
	/** DO NOT MODIFY */
	readonly imageNameTree: AtlasNameTree;

	constructor(
		readonly textures: Map<string, AtlasTexture>,
		meta: AtlasMetaTexture[],
	) {
		const err = (e: unknown) => { throw e; };
		this.images = new Map(meta.flatMap(({ name, images }) => {
			const texture = textures.get(name)
				?? err(new Error(`Could not find atlas texture with name ${name}`));
			return images.map(({
				path, sourceX, sourceY, sourceWidth, sourceHeight, centerX, centerY, width, height,
			}) => [path, new AtlasImage(
				texture,
				path,
				Rectangle.fromSize(sourceX, sourceY, sourceWidth, sourceHeight),
				new Vector2(-centerX, -centerY),
				new Vector2(width, height),
			)]);
		}));
		this.imageNameTree = Atlas.toNameTree(this.images);
		this.subimages = Atlas.generateSubimages(this.images);
	}

	getSubimagesSorted(path: string): [index: number, image: AtlasImage][] {
		return this.subimages.get(path.toLowerCase())?.entries().toArray().sort(([a], [b]) => a - b) ?? [];
	}
	getSubimage(path: string, idx: number): AtlasImage | null {
		return this.subimages.get(path.toLowerCase())?.get(idx) ?? null;
	}

	static toNameTree(
		images: Map<string, AtlasImage>,
		root: AtlasNameTree = { name: "" }, overwrite: boolean = false
	): AtlasNameTree {
		const lookup = new Map<string, AtlasNameTree>([
			["", root]
		]);
		const findEntry = (path: string): AtlasNameTree => {
			// path: "a/b/c/d" => [d, c, b, a].
			const tails: string[] = [];
			while (true) {
				const parent = lookup.get(path);
				if (parent) {
					const [_, tree] = tails.reduceRight(([path, node], tail) => {
						const child: AtlasNameTree = {
							name: tail,
						};
						if (path) path += "/";
						path += tail;
						(node.children ??= new Map<string, AtlasNameTree>()).set(tail, child);
						lookup.set(path, child)
						return [path, child];
					}, [path, parent]);
					return tree;
				}

				const slash = path.lastIndexOf("/");
				if (slash < 0) {
					tails.push(path);
					path = "";
					continue;
				}
				tails.push(path.slice(slash + 1));
				path = path.slice(0, slash);
			}
		}
		const addEntry = (img: AtlasImage) => {
			const entry = findEntry(img.path);
			if (entry.image && !overwrite) {
				console.error("unreachable! Atlas image tried to ", img, entry.image);
			}
			entry.image = img;
		};

		images.forEach(addEntry);

		return root;
	}

	static generateSubimages = (images: Map<string, AtlasImage>): Map<string, Map<number, AtlasImage>> => {
		const map = new Map<string, Map<number, AtlasImage>>();
		for (const [path, img] of images) {
			const match = path.match(/^(.+?)(\d*)$/);
			if (match === null) continue;
			// incredibly cursed, but it works
			// this does mean xxx00 and xxx overwrite each other
			const num = parseInt(match[2] || "0");
			if (!isFinite(num)) continue;
			map.getOrInsertComputed(match[1].toLowerCase(), () => new Map()).set(num, img);
		}
		return map;
	}

	static readFromUrls = async (
		metaSrc: string,
		// is a map because those are easier to work with.
		// would be *fine* as a Record but i just don't wanna deal with that rn
		textureSrcs: Map<string, string>,
	) => {
		const [meta, ...images] = await Promise.all([
			this.readAtlasMeta(metaSrc),
			...textureSrcs.entries().map(([name, src]) =>
				this.readAtlasTexture(src)
					.then(t => [name, t] as const)
			)
		]);

		return new Atlas(
			new Map(images.map(([name, image]) => [name, {
				name,
				image,
				width: image.width,
				height: image.height,
			} satisfies AtlasTexture])),
			meta
		);
	}

	static readAtlasTexture = (src: string, onProgress?: (info: AtlasDataReadInfo) => void): Promise<ImageBitmap> => {
		const url = new URL(src, window.location.href).href;
		const worker = new Worker("./dst/atlas_data.worker.js");
		let done = false;

		const { promise, resolve, reject } = Promise.withResolvers<ImageBitmap>();

		worker.addEventListener("message", e => {
			if (done) return;

			const msg = e.data as AtlasDataOut;
			switch (msg.type) {
				case "progress": {
					onProgress?.(msg.info);
					break;
				}
				case "done": {
					done = true;
					const { image } = msg;
					resolve(image);
					break;
				}
			}
		});
		worker.addEventListener("error", e => {
			reject(e.error);
			console.error("Failed to make atlas image worker:", e);
		});
		worker.postMessage(url satisfies AtlasDataIn);

		return promise;
	}

	static readAtlasMeta = (src: string): Promise<AtlasMetaTexture[]> => {
		const url = new URL(src, window.location.href).href;
		const worker = new Worker("./dst/atlas_meta.worker.js");
		let done = false;

		const { promise, resolve, reject } = Promise.withResolvers<AtlasMetaTexture[]>();

		worker.addEventListener("message", e => {
			if (done) return;

			const msg = e.data as AtlasMetaOut;
			switch (msg.type) {
				case "done": {
					done = true;
					const { textures: data } = msg;
					resolve(data);
					break;
				}
			}
		});
		worker.addEventListener("error", e => {
			reject(e.error);
			console.error("Failed to make atlas meta worker:", e);
		});
		worker.postMessage(url satisfies AtlasMetaIn);

		return promise;
	}
}
