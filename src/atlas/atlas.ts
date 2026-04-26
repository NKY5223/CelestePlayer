import { Rectangle } from "../utils/rectangle.js";
import type { AtlasMetaIn, AtlasMetaOut, AtlasMetaTexture } from "./meta.worker.js";
import type { AtlasDataIn, AtlasDataOut, AtlasDataReadInfo } from "./data.worker.js";
import { AtlasImage } from "./image.js";
import { Texture } from "./texture.js";
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
/** 
 * An {@linkcode Atlas} is a map of {@linkcode AtlasImage}s and subimages (like `xxx00`, `xxx01`).
 */
export class Atlas {
	/** DO NOT MODIFY */
	readonly images: Map<string, AtlasImage> = new Map();
	/** 
	 * contains *lowercase* ids, because celeste is WEIRD and 
	 * uses case-insensitive `Dictionary`s for subtextures
	 * JAVASCRIPT DOES NOT HAVE THIS FEATURE 
	 * i get that they bundled it from windows but you can RENAME the file,,, please,,,
	 * 
	 * TODO: sort this map so you don't have to resort for `getSubimages` every time
	 * 
	 * fnuuy thing idk why i wrote this:
	 * 
	 * at least `.toLowerCase()` is essentially a map from `string` to 
	 * its quotient over case-insensitive equality
	 */
	protected readonly subimages: Map<string, Map<number, AtlasImage>> = new Map();
	/** DO NOT MODIFY */
	readonly imageNameTree: AtlasNameTree = { name: "<root>" };

	constructor(
		readonly textures: Map<string, Texture>,
		meta: AtlasMetaTexture[],
	) {
		const err = (e: unknown) => { throw e; };
		const images = meta.flatMap(({ name, images }) => {
			const texture = textures.get(name)
				?? err(new Error(`Could not find atlas texture with name ${name}`));
			return images.map(({
				path, sourceX, sourceY, sourceWidth, sourceHeight, centerX, centerY, width, height,
			}) => new AtlasImage(
				texture,
				path,
				Rectangle.fromSize(sourceX, sourceY, sourceWidth, sourceHeight),
				new Vector2(-centerX, -centerY),
				new Vector2(width, height),
			));
		});
		images.forEach(i => this.addImage(i));
	}

	addImage(image: AtlasImage) {
		const path = image.path;
		this.images.set(path, image);

		const parts = path.split("/");
		let tree = this.imageNameTree;
		for (const part of parts) {
			const children = tree.children ??= new Map<string, AtlasNameTree>();
			tree = children.getOrInsertComputed(part, name => ({ name }));
		}
		tree.image = image;

		const match = path.match(/^(.+?)(\d*)$/);
		if (match !== null) {
			// incredibly cursed, but it works
			// this does mean xxx00 and xxx overwrite each other
			// but that seems like desired behaviour
			const num = parseInt(match[2] || "0");
			if (isFinite(num)) {
				this.subimages.getOrInsertComputed(match[1].toLowerCase(), () => new Map()).set(num, image);
			}
		}
	}

	get(path: string): AtlasImage | null {
		return this.images.get(path) ?? null;
	}

	getSubimage(path: string, idx: number): AtlasImage | null {
		return this.getSubimagesFor(path)?.get(idx) ?? null;
	}
	getSubimages(path: string): AtlasImage[] {
		return this.getSubimagesWithIndex(path).map(([_, img]) => img);
	}
	/** Returns the subimages for `path`, sorted according to index. */
	getSubimagesWithIndex(path: string): [index: number, image: AtlasImage][] {
		return this.subimages.get(path.toLowerCase())?.entries().toArray().sort(([a], [b]) => a - b) ?? [];
	}
	getSubimagesFor(path: string): Map<number, AtlasImage> | null {
		return this.subimages.get(path.toLowerCase()) ?? null;
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
			new Map(images.map(([name, image]) =>
				[name, new Texture(image, name, image.width, image.height)]
			)),
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
