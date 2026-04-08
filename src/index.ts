import { readAtlasImage } from "./atlas/atlas.js";
import { Graph } from "./graph.js";

const graph = new Graph({
	title: "Progress",
	width: 300,
	height: 200,
	left: 0,
	top: 1,
	bottom: 0,
	right: 1,
});
const canvas = document.createElement("canvas");
canvas.title = "Result";
canvas.append("Result");

const button = document.createElement("button");
button.addEventListener("click", async () => {
	const start = performance.now();
	button.disabled = true;
	const image = await readAtlasImage("/bin/Gameplay0.data", info => {
		const { blobIndex, blobSize } = info;
		const t = (performance.now() - start) / 1000;
		if (t > graph.right) graph.right = t;
		graph.top = blobSize;
		graph.add(t, blobIndex);
	});

	const ctx = canvas.getContext("2d");
	if (!ctx) throw "no ctx";

	canvas.width = image.width;
	canvas.height = image.height;

	ctx.drawImage(image, 0, 0);
});
button.append("Read .data");
document.addEventListener("DOMContentLoaded", () => {
	document.body.append(button, graph.element, canvas);
});