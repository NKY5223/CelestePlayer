import { Atlas } from "../atlas/atlas.js";
import { AtlasImage } from "../atlas/image.js";
import { EventManager, HasEvents } from "../../utils/events.js";
import { Vector2 } from "../../utils/vector2.js";
import { SpriteAnimation } from "./animation.js";
import { SpriteSource } from "./source.js";

type SpriteEvents = {
	/** Fires when `.play()` is called with a non-null value */
	play: SpriteAnimation;
	/** Fires when currentAnimation changes */
	changeAnim: string | null;
	/** Fires when the frame changes */
	changeFrame: AtlasImage;
};
export class Sprite implements HasEvents<SpriteEvents> {
	// #region Data
	readonly sources: SpriteSource[] = [];
	/** All `<Metadata>`s of this {@linkcode Sprite}'s {@linkcode SpriteSource}s. */
	public get metadata(): Element[] { return this.sources.flatMap(s => s.metadata); }
	// #endregion

	// #region Animation state
	currentAnimation: SpriteAnimation | null = null;
	animationFrame: number = 0;
	animationTime: number = 0;
	speed: number = 1;

	/** ONLY MODIFY VIA {@linkcode Sprite.setFrame setFrame}. */
	#image: AtlasImage = AtlasImage.FALLBACK;
	public get image(): AtlasImage { return this.#image; }
	// #endregion

	// #region Transformations
	/** If component is 0, align start of texture to position. If .5, center. If 1, end. */
	justify: Vector2 | null = null;
	/** If `justify` is nonnull, will get overridden on frame change. */
	offset: Vector2 = Vector2.ZERO;
	
	/** Scale of texture, centered on origin (draw position). */
	scale: Vector2 = Vector2.ONE;
	// #endregion

	protected readonly events: EventManager<SpriteEvents> = new EventManager();

	constructor(
		readonly name: string,
		readonly atlas: Atlas,
		/** Defines the root from which `Animation` paths are referenced from. */
		readonly path: string,
		readonly animations: Map<string, SpriteAnimation> = new Map(),

		public initialAnimation: string | null = null,

		readonly defaultFrametime: number = 0,
	) {
	}

	draw2d(ctx: CanvasRenderingContext2D, pos: Vector2) {
		this.draw2dScaled(ctx, pos, this.scale);
	}
	/** Draws sprite with a specific scale, overriding its own {@linkcode Sprite.scale scale}. */
	draw2dScaled(ctx: CanvasRenderingContext2D, pos: Vector2, scale: Vector2) {
		this.#image.draw2dScaled(ctx, pos.add(this.offset.mul(scale)), scale);
	}

	play(id: string | null) {
		if (id === null) {
			this.currentAnimation = null;
			this.events.dispatch("changeAnim", null);
			return;
		}
		const anim = this.animations.get(id);
		if (!anim) {
			console.warn("Sprite '%s' does not have animation '%s'.", this.name, id);
			this.play(null);
			return;
		}

		this.currentAnimation = anim;
		this.animationTime = 0;
		// start at other end if speed is negative (rewinding)
		// else it `MoveNext`s next frame
		this.animationFrame = this.speed < 0 ? anim.frames.length - 1 : 0;

		this.checkTime();
		this.updateFrame();

		this.events.dispatch("play", anim);
		this.events.dispatch("changeAnim", anim.id);
	}
	advance(time: number) {
		if (!this.currentAnimation) return;
		this.animationTime += time * this.speed;
		this.checkTime();
	}
	playStart() {
		this.play(this.initialAnimation);
	}

	private checkTime() {
		if (!this.currentAnimation) return;
		// Note: using `Math.trunc(· / ·)` does weird things when frametime is 0
		// frames = Infinity,
		// animationFrames -> Infinity,
		// animationTime -> NaN
		// and if animationTime is 0, frames = NaN and everything breaks.
		const frames = this.animationTime === 0 ? 0 : Math.trunc(this.animationTime / this.currentAnimation.frametime);
		if (frames === 0) return;
		this.animationFrame += frames;
		this.animationTime -= frames * this.currentAnimation.frametime;
		// reset to 0 when NaN
		if (isNaN(this.animationFrame)) this.animationFrame = 0;
		if (frames > 0) {
			if (this.animationFrame >= this.currentAnimation.frames.length) {
				this.moveNext();
			} else {
				this.updateFrame();
			}
			return;
		}
		if (frames < 0) {
			if (this.animationFrame < 0) {
				this.moveNext();
			} else {
				this.updateFrame();
			}
			return;
		}
	}
	private moveNext() {
		if (!this.currentAnimation) return;
		this.play(this.currentAnimation.next());
	}
	private updateFrame() {
		if (!this.currentAnimation) return;
		this.setFrame(this.currentAnimation.frames[this.animationFrame]);
		if (this.justify !== null) {
			this.offset = this.justify.neg().mul(this.#image.size);
		}
	}
	private setFrame(frame: AtlasImage | undefined) {
		if (frame === undefined) {
			// console.warn("Undefined frame passed", this.currentAnimation, this.animationFrame);
			return;
		}
		if (this.#image === frame) return;
		this.#image = frame;
		this.events.dispatch("changeFrame", frame);
	}

	addAnimation(animation: SpriteAnimation) {
		this.animations.set(animation.id, animation);
	}
	clone(override: Partial<Sprite> = {}) {
		const {
			name,
			atlas,
			animations,
			path,
			initialAnimation,
			defaultFrametime,
			sources,
			justify,
			offset,
		} = override;
		const sprite = new Sprite(
			name ?? this.name,
			atlas ?? this.atlas,
			path ?? this.path,
			animations ?? new Map(this.animations),
			initialAnimation ?? this.initialAnimation,
			defaultFrametime ?? this.defaultFrametime,
		);
		sprite.justify = justify !== undefined ? justify : this.justify;
		sprite.offset = offset ?? this.offset;
		sprite.currentAnimation = this.currentAnimation;
		sprite.sources.push(...sources ?? this.sources);
		return sprite;
	}

	addListener<E extends keyof SpriteEvents>(event: E, listener: (value: SpriteEvents[E]) => void): void {
		return this.events.add(event, listener);
	}
	removeListener<E extends keyof SpriteEvents>(event: E, listener: (value: SpriteEvents[E]) => void): void {
		return this.events.remove(event, listener);
	}

	toString() {
		return `Sprite('${this.name}')`;
	}
}