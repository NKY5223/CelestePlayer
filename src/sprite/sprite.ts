import { AtlasImage } from "../atlas/image.js";
import { EventManager, HasEvents } from "../utils/events.js";
import { Vector2 } from "../utils/vector2.js";

export namespace Sprite {
	export type Animation = {
		id: string;
		/** Time a frame should play before the next, in seconds. */
		frametime: number;
		/** Array of frame images. */
		frames: AtlasImage[];
		/** Animation to play after this one ends. Return `id` to loop. Return `null` to stop. */
		next: () => string | null;

		/** Path of animation textures (relative) */
		path: string;
		/** 
		 * STRING of frame indices (e.g. `0,1` => /player/walk00, /player/walk01)
		 * Why is this a string? Because `characters/player_no_backpack/idle` only goes up to 7, 
		 * while `characters/player/idle` goes up to 8!!!!!!!!! how wonderful!!!!
		 */
		frameIndices: string | null;
	};
}
type Animation = Sprite.Animation;

type SpriteEvents = {
	/** Fires when `.play()` is called with a non-null value */
	play: Animation;
	/** Fires when currentAnimation changes */
	changeAnim: string | null;
};
export class Sprite implements HasEvents<SpriteEvents> {
	currentAnimation: Animation | null;
	animationFrame: number = 0;
	animationTime: number = 0;
	speed: number = 1;

	justify: Vector2 | null = null;
	offset: Vector2 = Vector2.ZERO;

	#image: AtlasImage = AtlasImage.fallback;
	public get image(): AtlasImage { return this.#image; }

	protected readonly events: EventManager<SpriteEvents> = new EventManager();

	constructor(
		readonly name: string,
		readonly animations: Map<string, Animation>,
		readonly start: string | null = null,
	) {
		this.currentAnimation = null;
		if (start !== null) this.play(start);
	}

	draw2dScaled(ctx: CanvasRenderingContext2D, pos: Vector2, scale: number) {
		this.#image.draw2dScaled(ctx, pos.add(this.offset.scale(scale)), scale);
	}

	play(id: string | null) {
		if (id === null) {
			this.currentAnimation = null;
			this.events.dispatch("changeAnim", null);
			return;
		}
		const anim = this.animations.get(id);
		if (!anim) return;

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

	private checkTime() {
		if (!this.currentAnimation) return;
		// Note: using `Math.trunc(· / ·)` does weird things when frametime is 0
		// frames = Infinity,
		// animationFrames -> Infinity,
		// animationTime -> NaN
		// and moveNext is called immediately.
		// This is, surprisingly, exactly how a frametime of 0 is expected to behave, so
		// happy little accident :3
		// unless a 0-frame
		const frames = Math.trunc(this.animationTime / this.currentAnimation.frametime);
		if (frames === 0) return;
		this.animationFrame += frames;
		this.animationTime -= frames * this.currentAnimation.frametime;
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
		this.#image = this.currentAnimation.frames[this.animationFrame];
		if (this.justify !== null) {
			this.offset = this.justify.neg().mul(this.#image.size);
		}
	}

	addAnimation(animation: Animation) {
		this.animations.set(animation.id, animation);
	}
	clone({ name, animations, start, justify, offset }: Partial<Sprite> = {}) {
		const sprite = new Sprite(
			name ?? this.name,
			animations ?? new Map(this.animations),
			start ?? this.start
		);
		sprite.justify = justify !== undefined ? justify : this.justify;
		sprite.offset = offset ?? this.offset;
		sprite.currentAnimation = this.currentAnimation;
		return sprite;
	}

	addListener<E extends keyof SpriteEvents>(event: E, listener: (value: SpriteEvents[E]) => void): void {
		return this.events.add(event, listener);
	}
	removeListener<E extends keyof SpriteEvents>(event: E, listener: (value: SpriteEvents[E]) => void): void {
		return this.events.remove(event, listener);
	}
}