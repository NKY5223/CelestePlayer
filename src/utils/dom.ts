/** i "love" not using jsx rahhhh!!!! */
export const mkEl = <K extends keyof HTMLElementTagNameMap>(
	tag: K,
	options?:
		| {
			id?: string;
			classes?: string[];
			children?: (string | Node)[];
		}
		| (string | Node)[]
): HTMLElementTagNameMap[K] => {
	const el = document.createElement(tag);
	if (Array.isArray(options)) {
		el.append(...options);
	} else if (options !== undefined) {
		const { id, classes, children } = options;
		if (id !== undefined) el.id = id;
		if (classes !== undefined) el.classList.add(...classes);
		if (children !== undefined) el.append(...children);
	}
	return el;
};

export const mkCtx = (options: {
	width?: number;
	height?: number;
	pixelate?: boolean;
	/** what size to make the canvas (css pixel / canvas pixel). */
	scale?: number;
} = {}) => {
	const {
		width, height, pixelate = false, scale,
	} = options;
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw "no ctx";
	if (width !== undefined) canvas.width = width;
	if (height !== undefined) canvas.height = height;
	if (scale !== undefined) {
		canvas.style.width = `${canvas.width * scale}px`;
		canvas.style.height = `${canvas.height * scale}px`;
	}
	if (pixelate) {
		canvas.classList.add("pixelate");
		// cannot be done too early or it resets??
		ctx.imageSmoothingEnabled = false;
	}
	return ctx;
};
export const mkGl = (options: {
	width?: number;
	height?: number;
	pixelate?: boolean;
	/** what size to make the canvas (css pixel / canvas pixel). */
	scale?: number;
	contextOptions?: WebGLContextAttributes;
} = {}) => {
	const {
		width, height, pixelate = false, scale, contextOptions,
	} = options;
	const canvas = document.createElement("canvas");
	if (width !== undefined) canvas.width = width;
	if (height !== undefined) canvas.height = height;
	const gl = canvas.getContext("webgl", contextOptions);
	if (!gl) throw "no ctx";
	if (scale !== undefined) {
		canvas.style.width = `${canvas.width * scale}px`;
		canvas.style.height = `${canvas.height * scale}px`;
	}
	if (pixelate) {
		canvas.classList.add("pixelate");
	}
	return [gl, canvas] as const;
};
