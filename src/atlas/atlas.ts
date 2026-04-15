import { Rectangle } from "../utils/rectangle.js";
import type { AtlasMetaIn, AtlasMetaOut, AtlasMetaTexture } from "./meta.worker.js";
import type { AtlasDataIn, AtlasDataOut, AtlasDataReadInfo } from "./packedTexture.worker.js";

export type AtlasTexture = {
	name: string;
	width: number;
	height: number;
	image: CanvasImageSource;
};
export type AtlasImage = {
	/** texture source */
	texture: AtlasTexture;
	/** name of image */
	path: string;
	/** uv coordinates of image in texture (integer) */
	uv: Rectangle;
	/** Offset image */
	position: Rectangle;
};
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
	readonly images: Map<string, AtlasImage>;
	readonly imageNameTree: AtlasNameTree;
	constructor(
		readonly textures: Map<string, AtlasTexture>,
		meta: AtlasMetaTexture[],
	) {
		const err = (e: unknown) => { throw e; };
		console.log(meta);
		this.images = new Map(meta.flatMap(({ name, images }) => {
			const texture = textures.get(name)
				?? err(new Error(`Could not find atlas texture with name ${name}`));
			return images.map(({
				path, sourceX, sourceY, sourceWidth, sourceHeight, centerX, centerY, width, height,
			}) => [path, {
				path,
				texture,
				uv: Rectangle.fromSize(sourceX, sourceY, sourceWidth, sourceHeight),
				position: Rectangle.fromSize(-centerX, -centerY, width, height),
			} satisfies AtlasImage]);
		}));
		this.imageNameTree = Atlas.toNameTree(this.images);
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
		const worker = new Worker("./dst/packedTexture.worker.js");
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
		const worker = new Worker("./dst/meta.worker.js");
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
