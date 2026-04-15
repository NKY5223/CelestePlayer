/// <reference lib="webworker" />

import { BinaryBufferReader } from "../binary/bufferReader.js";

export type AtlasMetaImage = {
	path: string;
	sourceX: number;
	sourceY: number;
	sourceWidth: number;
	sourceHeight: number;
	centerX: number;
	centerY: number;
	width: number;
	height: number;
};
export type AtlasMetaTexture = {
	name: string;
	images: AtlasMetaImage[];
};
export type AtlasMetaIn = string;
export type AtlasMetaOut = (
	| {
		type: "done";
		textures: AtlasMetaTexture[];
	}
);
const post = (msg: AtlasMetaOut, transfers: Transferable[] = []) => self.postMessage(msg, transfers);

self.addEventListener("message", async e => {
	const msg = e.data as AtlasMetaIn;
	try {
		const data = await readMeta(msg);
		post({
			type: "done",
			textures: data,
		});
	} catch (err) {
		self.reportError(err);
	}
});

const readMeta = async (src: string) => {
	const res = await fetch(src);
	const blob = await res.blob();
	const reader = new BinaryBufferReader(await blob.arrayBuffer());
	reader.readInt32();
	reader.readString();
	reader.readInt32();
	const textures = Array.from<unknown, AtlasMetaTexture>({ length: reader.readInt16() }, () => {
		const texture = reader.readString();
		return {
			name: texture,
			images: Array.from<unknown, AtlasMetaImage>({ length: reader.readInt16() }, () => ({
				path: reader.readString().replaceAll("\\", "/"),
				sourceX: reader.readInt16(),
				sourceY: reader.readInt16(),
				sourceWidth: reader.readInt16(),
				sourceHeight: reader.readInt16(),
				centerX: reader.readInt16(),
				centerY: reader.readInt16(),
				width: reader.readInt16(),
				height: reader.readInt16(),
			}))
		};
	});
	return textures;
}