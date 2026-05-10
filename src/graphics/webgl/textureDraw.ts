import { Matrix4, Vector2, Vector3 } from "../../utils/vector.js";
import { AtlasImage } from "../atlas/image.js";
import { Texture } from "../atlas/texture.js";
import { Sprite } from "../sprite/sprite.js";
import { InterleavedAttribManager } from "./attrib/interleaved.js";
import { Gl, WebGlBase, WebGlType } from "./base.js";
import { ElementIndexManager } from "./elements.js";
import frag from "./textureDraw.frag";
import vert from "./textureDraw.vert";

export declare namespace TextureDraw {
	export type Vertex = {
		readonly pos: Vector2;
		readonly uv: Vector2;
	};
	export type DrawnImage = {
		readonly pos: Vector2;
		readonly size: Vector2;
		readonly image: AtlasImage;
	};
}
type Vertex = TextureDraw.Vertex;
export class TextureDraw {
	protected readonly batch: TextureDraw.DrawnImage[] = [];
	readonly textures = new WeakMap<Texture, WebGLTexture>();

	/** Expects the context to have antialiasing off. */
	constructor(readonly gl: Gl) { };
	readonly base = new WebGlBase(this.gl, vert, frag);
	readonly indexManager = new ElementIndexManager(this.base);
	readonly attribManager = InterleavedAttribManager.autoLayoutGeneric<Vertex>()(this.base, [
		["aPos", WebGlType.Float3],
		["aUV", WebGlType.Float2],
	], ({ pos, uv }) => ({
		aPos: new Vector3(pos.x, pos.y, 0),
		aUV: uv,
	}));

	getWebGlTextureFor(texture: Texture): WebGLTexture {
		return this.textures.getOrInsertComputed(texture, () => {
			const wtext = this.base.createTexture();
			this.base.setTextureSource(wtext, texture.source, WebGlBase.Pixelated);
			return wtext;
		});
	}

	drawImage(image: AtlasImage, pos: Vector2, scale: Vector2 = Vector2.ONE) {
		this.batch.push({
			pos: pos.add(image.offset.mul(scale)),
			size: image.uv.size.mul(scale),
			image,
		});
	}
	drawSprite(sprite: Sprite, pos: Vector2) {
		this.drawImage(sprite.image, pos.add(sprite.scaledOffset), sprite.scale);
	}

	render() {
		const gl = this.gl;
		const canvas = gl.canvas;

		const tx = 0;
		const ty = 0;
		const scale = 1;
		const viewProjRescale: Matrix4 = Matrix4
			.translate(-1, 1, 0)
			.mulMat(Matrix4.diag(2, -2, 1, 1))
			.mulMat(Matrix4.diag(scale / canvas.width, scale / canvas.height, 1, 1));
		const viewProjTranslateWorld: Matrix4 = Matrix4.translate(tx, ty, 0);
		const viewProj = viewProjRescale.mulMat(viewProjTranslateWorld);

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		for (const { pos, size, image } of this.batch) {
			const texture: WebGLTexture = this.getWebGlTextureFor(image.texture);
			this.indexManager.addIndices(
				this.attribManager.addQuadIndexed(
					{ pos: pos, uv: image.uv01.topLeft },
					{ pos: pos.add(size.justX()), uv: image.uv01.topRight },
					{ pos: pos.add(size.justY()), uv: image.uv01.bottomLeft },
					{ pos: pos.add(size), uv: image.uv01.bottomRight },
				)
			);

			this.base.setUniformFMat4("uViewProj", viewProj);
			this.base.setUniformSampler2D("uTexture", "TEXTURE_2D", 1, texture);
			this.attribManager.flush();
			this.indexManager.flush();

			this.base.drawElements(this.indexManager.count);
		}

		this.clear();
	}
	clear(): void { this.batch.length = 0; }
}