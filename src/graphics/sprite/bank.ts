import { Atlas } from "../atlas/atlas.js";
import { SpriteSource } from "./source.js";
import { Sprite } from "./sprite.js";

export class SpriteBank {
	constructor(
		readonly sprites: Map<string, Sprite> = new Map(),
	) { }

	addSpriteFromXml(xml: Element, atlas: Atlas, sources: Map<string, SpriteSource>) {
		const name = xml.tagName;
		if (sources.has(name)) {
			console.warn(`Source '%s' already exists in spritesheet; It will be overwritten (for [copy] purposes).`, name);
		}
		const path = xml.getAttribute("path") ?? "";
		const sprite = this.sprites.getOrInsertComputed(name, () => new Sprite(name, atlas, path));
		const copy = xml.getAttribute("copy");
		if (copy !== null) {
			const from = sources.get(copy);
			if (!from) console.error(`Source '%s' tried to [copy] from '%s', but no such sprite exists (yet).`, name, copy);
			else {
				SpriteSource.parseInto(from.xml, sprite);
			}
		}
		const src = SpriteSource.parseInto(xml, sprite);
		sources.set(name, src);
		return sprite;
	}

	get(name: string): Sprite | undefined { return this.sprites.get(name); }

	private static readonly parser = new DOMParser();
	static async readFromUrl(atlas: Atlas, url: string): Promise<SpriteBank> {
		const res = await fetch(url);
		const xml = await res.text();
		const doc = this.parser.parseFromString(xml, "application/xml");
		return SpriteBank.readXml(doc, atlas);
	}

	static readXml(doc: Document, atlas: Atlas) {
		const root = doc.documentElement;
		if (root.tagName !== "Sprites") {
			throw new Error(`Expected sprite xml to have <Sprites> as root, but received <${root.tagName}>`);
		}
		const bank = new SpriteBank();
		const sources = new Map<string, SpriteSource>();
		[...root.children].forEach(xml => bank.addSpriteFromXml(xml, atlas, sources));

		return bank;
	}
}