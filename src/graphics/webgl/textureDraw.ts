import { Color } from "../../utils/color.js";
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
		readonly color: Color;
	};
	export type DrawnImage = {
		readonly pos: Vector2;
		readonly size: Vector2;
		readonly image: AtlasImage;
		readonly color: Color;
	};
}
export class TextureDraw {
	protected readonly batch: TextureDraw.DrawnImage[] = [];
	readonly textures = new WeakMap<Texture, WebGLTexture>();
	readonly base: WebGlBase;
	readonly indexManager: ElementIndexManager;
	// Note: let TS infer its type, as it's really long otherwise
	readonly attribManager;

	/** Expects the context to have antialiasing off. */
	constructor(readonly gl: Gl) {
		this.base = new WebGlBase(this.gl, vert, frag);
		this.indexManager = new ElementIndexManager(this.base);
		this.attribManager = InterleavedAttribManager.autoLayoutGeneric<TextureDraw.Vertex>()(this.base, [
			["aPos", WebGlType.Float3],
			["aUV", WebGlType.Float2],
			["aColor", WebGlType.Float4],
		], ({ pos, uv, color, }) => ({
			aPos: new Vector3(pos.x, pos.y, 0),
			aUV: uv,
			aColor: color,
		}));
	};

	getWebGlTextureFor(texture: Texture): WebGLTexture {
		return this.textures.getOrInsertComputed(texture, () => {
			const wtext = this.base.createTexture();
			this.base.setTextureSource(wtext, texture.source, WebGlBase.Pixelated);
			return wtext;
		});
	}

	drawImage(image: AtlasImage, pos: Vector2, scale: Vector2 = Vector2.ONE, color: Color = Color.WHITE) {
		this.batch.push({
			pos: pos.add(image.offset.mul(scale)),
			size: image.uv.size.mul(scale),
			color,
			image,
		});
	}
	drawSprite(sprite: Sprite, pos: Vector2) {
		this.drawImage(sprite.image, pos.add(sprite.scaledOffset), sprite.scale);
	}

	enableBlend() {
		const gl = this.gl;
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
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

		this.enableBlend();

		for (const { pos, size, image, color } of this.batch) {
			const texture: WebGLTexture = this.getWebGlTextureFor(image.texture);
			this.indexManager.addIndices(
				this.attribManager.addQuadIndexed(
					{ pos: pos, uv: image.uv01.topLeft, color },
					{ pos: pos.add(size.justX()), uv: image.uv01.topRight, color },
					{ pos: pos.add(size.justY()), uv: image.uv01.bottomLeft, color },
					{ pos: pos.add(size), uv: image.uv01.bottomRight, color },
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