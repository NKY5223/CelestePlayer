/// <reference lib="webworker" />

import { BinaryBufferReader } from "../binary/bufferReader.js";

export type AtlasDataReadInfo = {
	blobIndex: number;
	blobSize: number;
};

export type AtlasDataIn = string;
export type AtlasDataOut = (
	| {
		type: "progress";
		info: AtlasDataReadInfo;
	}
	| {
		type: "done";
		image: ImageBitmap
	}
);

const post = (msg: AtlasDataOut, transfers: Transferable[] = []) => self.postMessage(msg, transfers);

self.addEventListener("message", async e => {
	const msg = e.data as AtlasDataIn;
	try {
		const img = await readPackedTexture(msg, info => {
			post({
				type: "progress",
				info,
			});
		});
		post({
			type: "done",
			image: img,
		}, [img]);
	} catch (err) {
		self.reportError(err);
	}
});

const readPackedTexture = async (src: string, update: (info: AtlasDataReadInfo) => void, updateInterval = 100) => {
	const res = await fetch(src);
	const blob = await res.blob();
	const reader = new BinaryBufferReader(await blob.arrayBuffer());

	const w = reader.readInt32();
	const h = reader.readInt32();
	const doAlpha = reader.readUint8() === 1;
	const totalSize = 4 * w * h;

	if (w < 0 || h < 0) {
		throw new Error("width or height is negative");
	}

	const canvas = new OffscreenCanvas(w, h);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("2d context is null.");
	const imgData = ctx.getImageData(0, 0, w, h);
	const data = imgData.data;

	const reportProgress = () => {
		update({
			blobIndex: reader.index,
			blobSize: blob.size
		});
	}

	let dataIdx = 0;
	let prevUpdate = performance.now() - updateInterval - 1000;
	const push = (repeats: number, r: number, g: number, b: number, a: number) => {
		if (repeats <= 0) return;
		const i = dataIdx;
		dataIdx += 4 * repeats;
		data[i + 0] = r;
		data[i + 1] = g;
		data[i + 2] = b;
		data[i + 3] = a;
		if (repeats <= 1) return;
		// curr is the current # of repeats
		let curr = 1;
		while (curr < repeats) {
			const end = i + 4 * curr;
			// double repeated length
			data.copyWithin(end, i, end);
			curr <<= 1;
		}
		// curr is now double what it should be
		curr >>= 1;
		const needed = repeats - curr;
		if (needed === 0) return;

		const end = i + 4 * curr;
		data.copyWithin(end, end - 4 * needed, end);

	}

	while (dataIdx < totalSize) {
		const repeats = reader.readUint8();
		if (doAlpha) {
			const a = reader.readUint8();
			if (a > 0) {
				const b = reader.readUint8();
				const g = reader.readUint8();
				const r = reader.readUint8();
				push(repeats, r, g, b, a);
			} else {
				push(repeats, 0, 0, 0, 0);
			}
		} else {
			const b = reader.readUint8();
			const g = reader.readUint8();
			const r = reader.readUint8();
			push(repeats, r, g, b, 0xff);
		}
		const now = performance.now();
		if (prevUpdate + updateInterval < now) {
			prevUpdate = now;
			reportProgress();
		}
		// break early for debugging
		// if (dataIdx > 4 * 4096 * 16) break;
	}

	ctx.putImageData(imgData, 0, 0);

	reportProgress();

	return canvas.transferToImageBitmap();
}
