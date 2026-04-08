import { PackedTextureOut, PackedTextureIn, PackedTextureProgressInfo } from "./packedTexture.worker.js";

export const readAtlasImage = (src: string, onProgress?: (info: PackedTextureProgressInfo) => void) => {
	const worker = new Worker("./dst/packedTexture.worker.js");
	let done = false;

	const { promise, resolve, reject } = Promise.withResolvers<ImageBitmap>();

	worker.addEventListener("message", e => {
		if (done) return;

		const msg = e.data as PackedTextureOut;
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
		console.error("Failed to read atlas image:", e);
	});
	worker.postMessage(src satisfies PackedTextureIn);

	return promise;
}