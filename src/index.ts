import { Atlas } from "./atlas/atlas.js";
import { Graph } from "./graph.js";

const makeCtx = (options: { width?: number; height?: number } = {}) => {
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

const button = document.createElement("button");
button.addEventListener("click", async () => {
	button.disabled = true;

	// const [graph, imagePromise] = readAtlasImageWithGraph("/bin/Gameplay0.data");
	// document.body.append(graph.element);
	// const image = await imagePromise;
	
	const [image, meta] = await Promise.all([
		Atlas.readAtlasTexture("/bin/Gameplay0.data"),
		Atlas.readAtlasMeta("/bin/Gameplay.meta"),
	]);
	const ctx = makeCtx({
		width: image.width,
		height: image.height,
	});
	ctx.drawImage(image, 0, 0);
	document.body.append(ctx.canvas);
	console.log(meta);
});

button.append("Read atlas");
document.addEventListener("DOMContentLoaded", () => {
	document.body.append(button);
});