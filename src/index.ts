import { BinaryStreamReader } from "./binary/streamReader.js";

const test = async () => {
	const res = await fetch("./bin/Gameplay0.data");
	const blob = await res.blob();
	console.log(`Texture blob is ${blob.size} bytes`);
	const canvas = await readPackedTexture(blob);
	console.log(`Finished reading ${canvas.width}×${canvas.height} image.`);
	document.body.append(canvas);
}

const readPackedTexture = async (blob: Blob) => {
	using reader = new BinaryStreamReader(blob.stream());

	const w = await reader.readInt32();
	const h = await reader.readInt32();
	const doAlpha = await reader.readUint8() === 1;
	const totalSize = 4 * w * h;

	if (w < 0 || h < 0) {
		throw new Error("width or height is negative");
	}

	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("2d context is null.");
	const imgData = ctx.getImageData(0, 0, w, h);

	let dataIdx = 0;
	const push = (repeats: number, r: number, g: number, b: number, a: number) => {
		while (repeats-- > 0) {
			imgData.data[dataIdx++] = r;
			imgData.data[dataIdx++] = g;
			imgData.data[dataIdx++] = b;
			imgData.data[dataIdx++] = a;
		}
	}

	while (dataIdx < totalSize) {
		const repeats = await reader.readUint8();
		if (doAlpha) {
			const a = await reader.readUint8();
			if (a > 0) {
				const b = await reader.readUint8();
				const g = await reader.readUint8();
				const r = await reader.readUint8();
				push(repeats, r, g, b, a);
			} else {
				push(repeats, 0, 0, 0, 0);
			}
		} else {
			const b = await reader.readUint8();
			const g = await reader.readUint8();
			const r = await reader.readUint8();
			push(repeats, r, g, b, 0xff);
		}
		// break early for debugging
		if (dataIdx > 0x100000) break;
	}

	ctx.putImageData(imgData, 0, 0);

	return canvas;
}

const button = document.createElement("button");
button.addEventListener("click", test);
button.append("click for lag");
document.addEventListener("DOMContentLoaded", () => {
	document.body.append(button);
});