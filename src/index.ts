import { Atlas, AtlasImage, AtlasNameTree } from "./atlas/atlas.js";
import { Graph } from "./graph.js";

const mkEl = <K extends keyof HTMLElementTagNameMap>(tag: K, options?: {
	id?: string;
	classes?: string[];
	children?: (string | Node)[];
} | (string | Node)[]): HTMLElementTagNameMap[K] => {
	const el = document.createElement(tag);
	if (Array.isArray(options)) {
		el.append(...options)
	} else if (options !== undefined) {
		const { id, classes, children } = options;
		if (id !== undefined) el.id = id;
		if (classes !== undefined) el.classList.add(...classes);
		if (children !== undefined) el.append(...children);
	}
	return el;
}
const mkCtx = (options: { width?: number; height?: number } = {}) => {
	const { width, height } = options;
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw "no ctx";
	if (width !== undefined) canvas.width = width;
	if (height !== undefined) canvas.height = height;
	return ctx;
}

const readAtlasImageWithGraph = (src: string): [Graph, Promise<ImageBitmap>] => {
	const graph = new Graph({
		title: "Progress",
		width: 300,
		height: 200,
		left: 0,
		top: 1,
		bottom: 0,
		right: 1,
	});

	const start = performance.now();
	return [graph, Atlas.readAtlasTexture(src, info => {
		const { blobIndex, blobSize } = info;
		const t = (performance.now() - start) / 1000;
		if (t > graph.right) graph.right = t;
		graph.top = blobSize;
		graph.add(t, blobIndex);
	})];
}

const makeAtlasTree = (
	name: string | Node, tree: AtlasNameTree,
	highlight?: (img: AtlasImage) => void
): Element => {
	const title = mkEl("span", {
		classes: ["title"],
		children: [name],
	});
	const image = tree.image;
	if (image) {
		title.classList.add("image");
		title.tabIndex = 0;
		title.addEventListener("click", () => {
			highlight?.(image);
		});
		title.addEventListener("keypress", e => {
			if (e.code === "Enter" || e.code === "Space") {
				highlight?.(image);
				e.preventDefault();
			}
		});
	}
	const main = tree.children
		? mkEl("details", {
			classes: ["tree"], children: [
				mkEl("summary", [title]),
				mkEl("ul", tree.children.entries().toArray()
					// this sort could totally be just `.sort()` due to array tostring rules
					// just a cursed thought 
					.sort(([a], [b]) => a < b ? -1 : a === b ? 0 : 1)
					.map(([name, child]) =>
						mkEl("li", [
							makeAtlasTree(name, child, highlight)
						])
					)
				)
			]
		})
		: mkEl("div", [
			title,
		]);

	return main;
}


const layout = mkEl("div");
layout.classList.add("layout");
const topDiv = mkEl("div");
const treeDiv = mkEl("div", { classes: ["treeContainer"] });
const atlasDiv = mkEl("div", { classes: ["atlasContainer"] });
layout.append(topDiv, treeDiv, atlasDiv);


const button = mkEl("button", ["Read atlas"]);
button.addEventListener("click", async () => {
	button.disabled = true;

	const atlas = await Atlas.readFromUrls(
		"./bin/Gameplay.meta",
		new Map([
			["Gameplay0", "./bin/Gameplay0.data"]
		])
	);
	console.log(atlas);
	const texture0 = [...atlas.textures.values()][0]!;

	const ctx = mkCtx({
		width: texture0.width,
		height: texture0.height,
	});
	const canvas = ctx.canvas;
	canvas.style.setProperty("--width", `${canvas.width}`);
	canvas.style.setProperty("--height", `${canvas.height}`);
	let scale = 1;
	const setScale = (s: number) => {
		scale = s;
		if (scale < 1) scale = 1;
		if (scale > 8) scale = 8;
		atlasDiv.style.setProperty("--scale", `${scale}px`);
	}
	setScale(2);
	atlasDiv.addEventListener("wheel", e => {
		if (!e.ctrlKey) return;
		e.preventDefault();
		setScale(scale + -Math.sign(e.deltaY));
	});

	const box = mkEl("div", { classes: ["box"] });
	const overlay = mkEl("div", { classes: ["overlay"], children: [box] });
	const scrollToBox = () => box.scrollIntoView({
		block: "center",
		inline: "center",
	});
	const highlight = (image: AtlasImage | null, scroll = true) => {
		if (!image) {
			overlay.hidden = true;
			return;
		}
		if (image.texture !== texture0) return;
		overlay.hidden = false;
		overlay.style.setProperty("--left", `${image.uv.left}`);
		overlay.style.setProperty("--right", `${image.uv.right}`);
		overlay.style.setProperty("--top", `${image.uv.top}`);
		overlay.style.setProperty("--bottom", `${image.uv.bottom}`);
		if (scroll) scrollToBox();
		box.dataset.path = image.path;
	}
	highlight(null);

	canvas.addEventListener("click", e => {
		if (e.ctrlKey) {
			scrollToBox();
			return;
		}
		if (e.shiftKey) {
			highlight(null);
			return;
		}
		const x = e.offsetX / scale;
		const y = e.offsetY / scale;
		const candidates = atlas.images.values().filter(i => i.uv.contains(x, y)).toArray();
		console.log("Candidates for (%i, %i): %o", x, y, candidates);
		if (candidates.length === 0) {
			highlight(null);
		} else {
			highlight(candidates[0], false);
		}
	});

	ctx.drawImage(texture0.image, 0, 0);

	treeDiv.append(makeAtlasTree("<root>", atlas.imageNameTree, highlight));
	atlasDiv.append(canvas, overlay);
});
topDiv.append(button);


document.addEventListener("DOMContentLoaded", () => {
	document.body.append(layout);
});