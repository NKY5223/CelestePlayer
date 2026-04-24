type GraphOptions = {
	title?: string;
	left?: number;
	right?: number;
	top?: number;
	bottom?: number;
	width?: number;
	height?: number;
};

export class Graph {
	private readonly svg: SVGSVGElement;
	private readonly lines: SVGPolylineElement;
	readonly points: [number, number][] = [];
	private updating: boolean = false;

	#left: number = 0;
	public get left(): number { return this.#left; }
	public set left(value: number) { this.#left = value; this.update(); }
	#right: number = 1;
	public get right(): number { return this.#right; }
	public set right(value: number) { this.#right = value; this.update(); }
	#top: number = 1;
	public get top(): number { return this.#top; }
	public set top(value: number) { this.#top = value; this.update(); }
	#bottom: number = 0;
	public get bottom(): number { return this.#bottom; }
	public set bottom(value: number) { this.#bottom = value; this.update(); }

	#width: number = 100;
	public get width(): number { return this.#width; }
	public set width(value: number) { this.#width = value; this.update(); }
	#height: number = 100;
	public get height(): number { return this.#height; }
	public set height(value: number) { this.#height = value; this.update(); }

	constructor(options: GraphOptions = {}) {
		const svg = this.svg = Graph.makeSvgElement("svg");
		const lines = this.lines = Graph.makeSvgElement("polyline");
		lines.setAttribute("stroke", "#0f0");
		lines.setAttribute("stroke-width", "2");
		
		if (options.title) {
			const title = Graph.makeSvgElement("title");
			title.append(options.title);
			svg.append(title);
		}
		if (options.left !== undefined) this.#left = options.left;
		if (options.right !== undefined) this.#right = options.right;
		if (options.top !== undefined) this.#top = options.top;
		if (options.bottom !== undefined) this.#bottom = options.bottom;
		if (options.width !== undefined) this.#width = options.width;
		if (options.height !== undefined) this.#height = options.height;

		svg.append(lines);

		this.update();
	}
	
	add(x: number, y: number) {
		this.points.push([x, y]);
		this.updatePoints();
	}
	private mapPoint(x: number, y: number) {
		return [
			(x - this.#left) / (this.#right - this.#left) * this.#width,
			(y - this.#top) / (this.#bottom - this.#top) * this.#height,
		];
	}
	private update() {
		this.svg.setAttribute("width", String(this.#width));
		this.svg.setAttribute("height", String(this.#height));
		this.updatePoints();
	}
	private updatePoints() {
		if (this.updating) return;
		this.updating = true;
		requestAnimationFrame(() => {
			this.updating = false;
			this.lines.points.clear();
			for (const [x, y] of this.points.map(([x, y]) => this.mapPoint(x, y))) {
				this.lines.points.appendItem(Object.assign(this.svg.createSVGPoint(), {
					x, y
				}));
			}
		});
	}

	public get element(): Element {
		return this.svg;
	}
    
	static makeSvgElement<K extends keyof SVGElementTagNameMap>(qualifiedName: K): SVGElementTagNameMap[K] {
		return document.createElementNS("http://www.w3.org/2000/svg", qualifiedName);
	}
}