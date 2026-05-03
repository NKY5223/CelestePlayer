import { Atlas } from "../atlas/atlas.js";
import { AtlasImage } from "../atlas/image.js";
import { tryParseFloat } from "../../utils/parse.js";
import { chooserFromString } from "./chooser.js";
import { Sprite } from "./sprite.js";

/** 
 * A series of frames in an animation for a {@linkcode Sprite}.
 * 
 * NOTE: Is named `SpriteAnimation` because {@linkcode Animation} is already in the DOM library.
 */
export class SpriteAnimation {
	constructor(
		readonly id: string,
		/** Time a frame should play before the next, in seconds. */
		readonly frametime: number,
		/** Array of frame images. */
		readonly frames: AtlasImage[],
		/** Animation to play after this one ends. Return `id` to loop. Return `null` to stop. */
		readonly next: () => string | null,

		// For transferring animations to other sprites
		/** Path of animation textures (relative) */
		readonly path: string,
		/** 
		 * STRING of frame indices (e.g. `0,1` => /player/walk00, /player/walk01)
		 * Why is this a string? Because `characters/player_no_backpack/idle` only goes up to 7, 
		 * while `characters/player/idle` goes up to 8!!!!!!!!! how wonderful!!!!
		 */
		readonly frameIndices: string | null,
	) { }

	clone(override: Partial<SpriteAnimation> = {}) {
		const {
			id,
			frametime, frames,
			next,
			path,
			frameIndices,
		} = override;
		const anim = new SpriteAnimation(
			id ?? this.id,
			frametime ?? this.frametime,
			frames ?? [...this.frames],
			next ?? this.next,
			path ?? this.path,
			frameIndices ?? this.frameIndices,
		);
		return anim;
	}
};