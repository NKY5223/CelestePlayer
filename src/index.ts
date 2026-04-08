import type { PackedTextureIn, PackedTextureOut } from "./packedTexture.worker.js";

const test = async () => {
	console.time("textureRead");

	console.log(`Creating worker for texture read.`);
	const src = "/bin/Gameplay0.data";
	const worker = new Worker("./dst/packedTexture.worker.js");

	let done = false;
	worker.addEventListener("message", e => {
		if (done) return;

		const msg = e.data as PackedTextureOut;
		// console.log("Received message from worker", msg);
		switch (msg.type) {
			case "progress": {
				const { info: { blobSize, blobIndex } } = msg;
				// console.log(`Worker progress: ${blobIndex}B/${blobSize}B`);
				break;
			}
			case "done": {
				done = true;
				const { image } = msg;

				console.log(`Finished reading ${image.width}×${image.height} image.`);
				console.timeEnd("textureRead");

				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
				canvas.width = image.width;
				canvas.height = image.height;
				// canvas.style.width = `${image.width * 2}px`;
				// canvas.style.height = `${image.height * 2}px`;
				if (!ctx) throw "no ctx";
				ctx.drawImage(image, 0, 0);
				document.body.append(canvas);
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