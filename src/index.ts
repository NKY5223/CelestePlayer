import { Atlas, AtlasNameTree } from "./graphics/atlas/atlas.js";
import { AtlasImage } from "./graphics/atlas/image.js";
import { SpriteAnimation } from "./graphics/sprite/animation.js";
import { SpriteBank } from "./graphics/sprite/bank.js";
import { PlayerSprite } from "./graphics/sprite/player.js";
import { Sprite } from "./graphics/sprite/sprite.js";
import { WebGlBase, WebGlType } from "./graphics/webgl/base.js";
import { InterleavedAttribManager } from "./graphics/webgl/attrib/interleaved.js";
import { Color } from "./utils/color.js";
import { mkCtx, mkEl } from "./utils/dom.js";
import { Graph } from "./utils/graph.js";
import { Rectangle } from "./utils/rectangle.js";
import { Matrix4, Vector2, Vector3 } from "./utils/vector.js";
import { ElementIndexManager } from "./graphics/webgl/elements.js";

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


const mkAtlasTree = (
	name: string | Node, tree: AtlasNameTree,
	highlight?: (img: AtlasImage) => void
): Element => {
	const title = mkEl("span", {
		classes: ["title"],
		children: [name],
	});
	const image = tree.image;
	if (image) {
		title.classList.add("image");
		title.tabIndex = 0;
		title.addEventListener("click", () => {
			highlight?.(image);
		});
		title.addEventListener("keypress", e => {
			if (e.code === "Enter" || e.code === "Space") {
				highlight?.(image);
				e.preventDefault();
			}
		});
	}
	const main = tree.children
		? mkEl("details", {
			classes: ["tree"], children: [
				mkEl("summary", [title]),
				mkEl("ul", tree.children.entries().toArray()
					// this sort could totally be just `.sort()` due to array tostring rules
					// just a cursed thought 
					.sort(([a], [b]) =>
						a.toLowerCase() < b.toLowerCase() ? -1 :
							a === b ? 0 :
								1)
					.map(([name, child]) =>
						mkEl("li", [
							mkAtlasTree(name, child, highlight)
						])
					)
				)
			]
		})
		: mkEl("div", [
			title,
		]);

	return main;
}

const mkSpriteSelector = (bank: SpriteBank, setSprite: (name: string) => void, restrict?: string[]) => {
	const names = restrict ?? bank.sprites.keys();
	const el = mkEl("select", [...names.map(name => {
		const option = mkEl("option", [name]);
		option.value = name;
		return option;
	})]);
	el.addEventListener("input", () => setSprite(el.value));
	return el;
}

const mkAnimSelector = (sprite: Sprite) => {
	const el = mkEl("div", { classes: ["select"] });
	let buttons: (readonly [string | null, HTMLButtonElement])[] = [];
	const mkBtn = (sprite: Sprite, value: string | null, display: string = value ?? "<null>") => {
		const btn = mkEl("button", [display]);
		btn.addEventListener("click", () => {
			sprite.play(value);
			// console.log("Playing", value === null ? null : sprite.animations.get(value));
		});
		return [value, btn] as const;
	}
	const update = (sprite: Sprite) => {
		el.replaceChildren();
		buttons = [
			mkBtn(sprite, null),
			...sprite.animations.keys().map(k => mkBtn(sprite, k))
		];
		el.append(...buttons.map(a => a[1]));

		const updateBtns = (id = sprite.currentAnimation?.id ?? null) => buttons.forEach(([k, el]) =>
			el.classList[k === id ? "add" : "remove"]("active")
		);
		sprite.addListener("changeAnim", updateBtns);
		updateBtns();
	}
	update(sprite);

	return [el, update] as const;
}

const atlasDisplay = (atlas: Atlas): Element => {
	const treeDiv = mkEl("div", { classes: ["tree-container"], children: ["Atlas:"] });
	const atlasDiv = mkEl("div", { classes: ["atlas-container"] });
	const atlasScroller = mkEl("div", { classes: ["atlas-scroller"], children: [atlasDiv] });

	const texture0 = atlas.textures.get("Gameplay0")!;
	const ctx = mkCtx({
		width: texture0.width,
		height: texture0.height,
		pixelate: true,
	});
	const canvas = ctx.canvas;
	canvas.style.setProperty("--width", `${canvas.width}`);
	canvas.style.setProperty("--height", `${canvas.height}`);
	let scale = 1;
	const setScale = (s: number) => {
		scale = s;
		if (scale < 1) scale = 1;
		if (scale > 8) scale = 8;
		atlasDiv.style.setProperty("--scale", `${scale}px`);
	}
	setScale(2);
	atlasDiv.addEventListener("wheel", e => {
		if (!e.ctrlKey) return;
		e.preventDefault();
		setScale(scale + -Math.sign(e.deltaY));
	});

	const box = mkEl("div", { classes: ["box"] });
	const overlay = mkEl("div", { classes: ["overlay"], children: [box] });
	const scrollToBox = () => box.scrollIntoView({
		block: "center",
		inline: "center",
	});
	const highlight = (image: AtlasImage | null, scroll = true) => {
		if (!image) {
			overlay.hidden = true;
			return;
		}
		if (image.texture !== texture0) return;
		overlay.hidden = false;
		overlay.style.setProperty("--left", `${image.uv.left}`);
		overlay.style.setProperty("--right", `${image.uv.right}`);
		overlay.style.setProperty("--top", `${image.uv.top}`);
		overlay.style.setProperty("--bottom", `${image.uv.bottom}`);
		if (scroll) scrollToBox();
		box.dataset.text = `${image.path}\noffset=${image.offset.x},${image.offset.y} w=${image.size.x} h=${image.size.y}`;
	}
	highlight(null);

	canvas.addEventListener("click", e => {
		if (e.ctrlKey) {
			scrollToBox();
			return;
		}
		if (e.shiftKey) {
			highlight(null);
			return;
		}
		const x = e.offsetX / scale;
		const y = e.offsetY / scale;
		const candidates = atlas.images.values().filter(i => i.uv.contains(x, y)).toArray();
		// console.log("Candidates for (%i, %i): %o", x, y, candidates);
		if (candidates.length === 0) {
			highlight(null);
		} else {
			highlight(candidates[0], false);
		}
	});

	ctx.drawImage(texture0.source, 0, 0);

	treeDiv.append(mkAtlasTree("<root>", atlas.imageNameTree, highlight));
	atlasDiv.append(canvas, overlay);

	return mkEl("div", {
		classes: ["section", "section-big", "section-atlas"],
		children: [treeDiv, atlasScroller],
	});
}

const spriteDisplay = (bank: SpriteBank): Element => {
	const log = mkEl("output", { classes: ["log"] });

	const _sprite = bank.get("player")?.clone();
	if (!_sprite) return mkEl("div", ["no sprite"]);

	let sprite: Sprite = _sprite;

	const SCALE = 6;
	const SIZE = 128 * SCALE;
	const ctx = mkCtx({
		width: SIZE, height: SIZE,
		pixelate: true,
	});
	ctx.canvas.classList.add("sprite");

	const clear = () => {
		ctx.clearRect(0, 0, SIZE, SIZE);

		ctx.beginPath();
		ctx.moveTo(SIZE / 2, 0);
		ctx.lineTo(SIZE / 2, SIZE);
		ctx.moveTo(0, SIZE / 2);
		ctx.lineTo(SIZE, SIZE / 2);
		ctx.strokeStyle = "#f00";
		ctx.lineWidth = 2;
		ctx.stroke();
	}
	const render = (dt: number) => {
		clear();
		sprite.advance(dt);
		sprite.draw2dScaled(ctx, new Vector2(SIZE / 2), new Vector2(SCALE));
		log.value =
			`${sprite.currentAnimation?.id ?? null}` +
			`\n#${sprite.animationFrame.toString().padStart(2, "0")} ${sprite.image.path}` +
			`\n  t = ${sprite.animationTime.toFixed(3)}` +
			`\n  speed = ${sprite.speed.toFixed(3)}`
			;
	}
	let prev = performance.now();
	const renderLoop = (now: number) => {
		const ms = now - prev;
		prev = now;
		render(ms / 1000);
		requestAnimationFrame(renderLoop);
	}
	requestAnimationFrame(renderLoop);

	const speedSlider = mkEl("input");
	speedSlider.type = "range";
	speedSlider.min = "-5";
	speedSlider.max = "5";
	speedSlider.step = "0.1";
	speedSlider.value = String(sprite.speed);
	speedSlider.addEventListener("input", () => sprite.speed = +speedSlider.value);

	const [animSelect, updateAnimSelect] = mkAnimSelector(sprite);
	const setSprite = (name: string) => {
		const n = bank.get(name);
		if (!n) return;
		sprite = n.clone();
		sprite.playStart();
		sprite.speed = +speedSlider.value;
		updateAnimSelect(sprite);
	}

	const spriteSelect = mkSpriteSelector(bank, setSprite);

	updateAnimSelect(sprite);

	sprite.playStart();

	return mkEl("div", {
		classes: ["section", "section-sprite"],
		children: [
			ctx.canvas,
			mkEl("div", {
				classes: ["panel"],
				children: [
					spriteSelect,
					log,
					speedSlider,
					animSelect,
				]
			}),
		]
	});
}

const playerSpriteDisplay = (bank: SpriteBank): Element => {
	const log = mkEl("output", { classes: ["log"] });

	const _sprite = bank.get("player")?.clone();
	if (!_sprite) return mkEl("div", ["no sprite"]);
	let sprite: Sprite = _sprite;
	let playerSprite: PlayerSprite = new PlayerSprite(sprite);
	let facing = 1;

	const bangses = sprite.atlas.getSubimagesFor("characters/player/bangs");
	if (!bangses) return mkEl("div", ["no bangs"]);
	const bangsFallback = bangses.get(0);
	if (!bangsFallback) return mkEl("div", ["no bangs"]);

	const SCALE = 6;
	const SIZE = 128 * SCALE;
	const ctx = mkCtx({
		width: SIZE, height: SIZE,
		pixelate: true,
	});
	ctx.canvas.classList.add("sprite");
	const pos = new Vector2(SIZE / 2);
	const scale = new Vector2(SCALE);

	const clear = () => {
		ctx.clearRect(0, 0, SIZE, SIZE);

		ctx.beginPath();
		ctx.moveTo(SIZE / 2, 0);
		ctx.lineTo(SIZE / 2, SIZE);
		ctx.moveTo(0, SIZE / 2);
		ctx.lineTo(SIZE, SIZE / 2);
		ctx.strokeStyle = "#f00";
		ctx.lineWidth = 2;
		ctx.stroke();
	}
	const render = (dt: number) => {
		clear();
		const flip = new Vector2(Math.sign(facing), 1);
		const scaledFacing = new Vector2(SCALE * facing, SCALE);

		sprite.advance(dt);

		const hairOffset = playerSprite.hairOffset;
		if (hairOffset) {
			const bangsIndex = playerSprite.bangsFrame;
			const bangs = bangses.get(bangsIndex) ?? AtlasImage.FALLBACK;
			const bangsOffset = new Vector2(-5);

			// Vector2 vector = Sprite.HairOffset * new Vector2((float)Facing, 1f);
			// Nodes[0] = Sprite.RenderPosition + new Vector2(0f, -9f * Sprite.Scale.Y) + vector;
			const hairPos = new Vector2(0, -9 * sprite.scale.y).add(hairOffset.mul(flip)).add(bangsOffset);
			// ctx.scale(facing, 1);
			bangs.draw2dScaled(ctx, pos.add(hairPos.mul(scaledFacing)), scaledFacing);
		}

		sprite.draw2dScaled(ctx, pos, scaledFacing);

		log.value =
			`${sprite.currentAnimation?.id ?? null}` +
			`\n#${sprite.animationFrame.toString().padStart(2, "0")} ${sprite.image.path}` +
			`\n  t = ${sprite.animationTime.toFixed(3)}` +
			`\n  speed = ${sprite.speed.toFixed(3)}`
			;
	}
	let prev = performance.now();
	const renderLoop = (now: number) => {
		const ms = now - prev;
		prev = now;
		render(ms / 1000);
		requestAnimationFrame(renderLoop);
	}
	requestAnimationFrame(renderLoop);

	const speedSlider = mkEl("input");
	speedSlider.type = "range";
	speedSlider.min = "-5";
	speedSlider.max = "5";
	speedSlider.step = "0.1";
	speedSlider.value = String(sprite.speed);
	speedSlider.addEventListener("input", () => sprite.speed = +speedSlider.value);

	const [animSelect, updateAnimSelect] = mkAnimSelector(sprite);
	const setSprite = (name: string) => {
		const spr = bank.get(name);
		if (!spr) return;
		sprite = spr.clone();
		sprite.playStart();
		sprite.speed = +speedSlider.value;
		playerSprite = new PlayerSprite(sprite);
		updateAnimSelect(sprite);
	}

	const spriteSelect = mkSpriteSelector(bank, setSprite, ["player", "player_no_backpack", "player_badeline", "player_playback", "badeline"]);

	updateAnimSelect(sprite);

	sprite.playStart();

	return mkEl("div", {
		classes: ["section", "section-sprite"],
		children: [
			ctx.canvas,
			mkEl("div", {
				classes: ["panel"],
				children: [
					spriteSelect,
					log,
					speedSlider,
					animSelect,
				]
			}),
		]
	});
}

const webglDisplay = (atlas: Atlas): Element => {
	// #region canvas setup
	const canvas = mkEl("canvas");
	canvas.width = 600;
	canvas.height = 600;


	const gl = canvas.getContext("webgl");
	if (!gl) return mkEl("span", ["no webgl"]);
	// #endregion

	// #region webgl setup
	const base = new WebGlBase(gl, `
precision mediump float;
attribute vec3 aPos;
attribute vec2 aUV;
varying vec2 vUV;
uniform mat4 uViewProj;

void main() { 
	vUV = aUV;
	gl_Position = uViewProj * vec4(aPos, 1); 
}
`, `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uTexture;

void main() { 
	gl_FragColor = texture2D(uTexture, vUV);
	// gl_FragColor = vec4(vUV, 0, 1);
	// gl_FragColor = vec4(vUV, 0, 1) + texture2D(uTexture, vUV);
}
`);

	type Vertex = {
		pos: Vector2;
		uv: Vector2;
	};
	const attribManager = InterleavedAttribManager.autoLayout(base, [
		["aPos", WebGlType.Float3],
		["aUV", WebGlType.Float2],
	], ({ pos, uv }: Vertex) => ({
		aPos: new Vector3(pos.x, pos.y, 0),
		aUV: uv,
	}));

	const indexManager = new ElementIndexManager(base);
	// #endregion

	const texture = base.createTexture();
	base.setPlaceholderTexture(texture, "TEXTURE_2D");

	const image = atlas.get("characters/player/idle00");
	if (!image) return mkEl("span", ["no sprite"]);

	base.setTextureSource(texture, image.texture.source, WebGlBase.Pixelated);

	const tx = 0;
	const ty = 0;
	const scale = 12;
	const viewProjRescale: Matrix4 = Matrix4
		.translate(-1, 1, 0)
		.mulMat(Matrix4.diag(2, -2, 1, 1))
		.mulMat(Matrix4.diag(scale / canvas.width, scale / canvas.height, 1, 1));
	const viewProjTranslateWorld: Matrix4 = Matrix4.translate(tx, ty, 0);
	const viewProj = viewProjRescale.mulMat(viewProjTranslateWorld);
	console.log("view proj: ", viewProj);

	indexManager.addIndex(
		...attribManager.addQuadIndexed(
			{ pos: Vector2.ZERO.mul(image.uv.size), uv: image.uv01.topLeft },
			{ pos: Vector2.X.mul(image.uv.size), uv: image.uv01.topRight },
			{ pos: Vector2.Y.mul(image.uv.size), uv: image.uv01.bottomLeft },
			{ pos: Vector2.ONE.mul(image.uv.size), uv: image.uv01.bottomRight }
		),
		...attribManager.addQuadIndexed(
			{ pos: Vector2.ZERO.mul(image.uv.size).add(Vector2.ONE), uv: image.uv01.topLeft },
			{ pos: Vector2.X.mul(image.uv.size).add(Vector2.ONE), uv: image.uv01.topRight },
			{ pos: Vector2.Y.mul(image.uv.size).add(Vector2.ONE), uv: image.uv01.bottomLeft },
			{ pos: Vector2.ONE.mul(image.uv.size).add(Vector2.ONE), uv: image.uv01.bottomRight }
		),
	);
	
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	base.setUniformFMat4("uViewProj", viewProj);
	base.setUniformSampler2D("uTexture", "TEXTURE_2D", 1, texture);
	attribManager.flush();
	indexManager.flush();

	base.drawElements(indexManager.count);

	return mkEl("div", {
		classes: ["section"],
		children: [
			canvas
		]
	});
}

const layout = mkEl("div");
layout.classList.add("layout");
const topDiv = mkEl("div", { classes: ["section"] });
layout.append(topDiv);


const button = mkEl("button", ["Read atlas"]);
button.addEventListener("click", async () => {
	button.disabled = true;

	const atlas = await Atlas.readFromUrls(
		"./assets/Graphics/Atlases/Gameplay.meta",
		new Map([
			["Gameplay0", "./assets/Graphics/Atlases/Gameplay0.data"]
		])
	);
	console.log("Atlas:", atlas);


	const bank = await SpriteBank.readFromUrl(atlas, "./assets/Graphics/Sprites.xml");
	console.log("Bank:", bank);

	// topDiv.after(playerSpriteDisplay(bank));

	layout.append(webglDisplay(atlas));
	layout.append(atlasDisplay(atlas));
});
topDiv.append(button);


document.addEventListener("DOMContentLoaded", () => {
	document.body.append(layout);
});

Object.assign(window, { Atlas, AtlasImage, Sprite, SpriteBank, SpriteAnimation, Rectangle, Vector2 });
