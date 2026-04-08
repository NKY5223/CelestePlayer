import { Graph } from "./graph.js";
import type { PackedTextureIn, PackedTextureOut } from "./packedTexture.worker.js";

const test = async () => {
	console.log(`Creating worker for texture read.`);
	const src = "/bin/Gameplay0.data";
	const worker = new Worker("./dst/packedTexture.worker.js");
	const start = performance.now();
	let done = false;

	const graph = new Graph({
		title: "Progress",
		width: 300,
		height: 200,
		left: 0,
		top: 1,
		bottom: 0,
		right: 1,
	});

	const resultCanvas = document.createElement("canvas");
	resultCanvas.title = "Result";
	resultCanvas.append("Result");

	document.body.append(graph.element, resultCanvas);

	worker.addEventListener("message", e => {
		if (done) return;

		const msg = e.data as PackedTextureOut;
		switch (msg.type) {
			case "progress": {
				const { info: { blobSize, blobIndex } } = msg;
				const t = (performance.now() - start) / 1000;
				const x = t;
				const y = blobIndex;
				if (x > graph.right) graph.right = x;
				graph.top = blobSize;
				graph.add(x, y);
				break;
			}
			case "done": {
				done = true;
				const { image } = msg;
				const end = performance.now();
				const time = (end - start) / 1000;
				console.log(`Finished reading ${image.width}×${image.height} image. (${time.toFixed(3)}s)`);

				const ctx = resultCanvas.getContext("2d");
				if (!ctx) throw "no ctx";

				resultCanvas.width = image.width;
				resultCanvas.height = image.height;

				ctx.drawImage(image, 0, 0);
				break;
			}
		}
	});
	worker.postMessage(src satisfies PackedTextureIn);
}


const button = document.createElement("button");
button.addEventListener("click", test);
button.append("Read .data");
document.addEventListener("DOMContentLoaded", () => {
	document.body.append(button);
});