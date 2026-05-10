import { Flatten1, UnionToIntersection } from "../../../utils/types.js";
import { WebGlBase, WebGlLike, WebGlType } from "../base.js";

/** 
 * @param vertex Vertex to serialise into data.
 * @param view View into the allocated buffer. Insert data at 0, in little-endian format.
 */
type Serialiser<T> = (
	vertex: T,
	view: DataView,
) => void;
type LayoutPart = readonly [name: string, type: WebGlType];
type Layout = readonly LayoutPart[];

type LayoutPartValue<P extends LayoutPart> = P extends unknown
	? { readonly [k in P[0]]: WebGlType.ValueType<P[1]>; }
	: never;
type LayoutValues<L extends Layout> = Flatten1<UnionToIntersection<LayoutPartValue<L[number]>>>;

/** Uses one big buffer of interleaved data for all attributes. */
export class InterleavedAttribManager<T, const L extends Layout> {
	/** Batched vertices. Will be put in the buffer after it is flushed. */
	protected readonly vertices: T[] = [];

	constructor(
		readonly base: WebGlBase,
		readonly layout: L,
		readonly serialise: Serialiser<T>,
	) {
		this.bindAttribs();
	}
	readonly buffer: WebGLBuffer = this.base.createBuffer();
	/** Total byte width of layout. */
	readonly stride = this.layout.reduce((acc, [, type]) => acc + WebGlBase.sizeof(type), 0);

	bindAttribs() {
		let offset = 0;
		for (const [name, type] of this.layout) {
			this.base.setAttribBuffer(name, this.buffer, type, false, this.stride, offset);
			offset += WebGlBase.sizeof(type);
		}
	}

	/** Adds a vertex into the list, then returns its index. */
	addVertex(vertex: T): number { return this.vertices.push(vertex) - 1; }
	/** Adds vertices into the list, then returns their starting index. */
	addVertices(vertices: readonly T[]) {
		const l = this.vertices.length;
		this.vertices.push(...vertices);
		return l;
	}
	/** Adds 4 vertices into the list, then returns 6 indices forming two triangles of them. */
	addQuadIndexed(
		topLeft: T,
		topRight: T,
		bottomLeft: T,
		bottomRight: T,
	): [number, number, number, number, number, number] {
		const a = this.addVertex(topLeft);
		const b = this.addVertex(topRight);
		const c = this.addVertex(bottomLeft);
		const d = this.addVertex(bottomRight);
		return [a, b, d, a, d, c];
	}

	/** Flushes the batch into the buffer, **replacing** its contents. */
	flush(): void {
		const data = new ArrayBuffer(this.vertices.length * this.stride);
		for (const [i, vertex] of this.vertices.entries()) {
			this.serialise(vertex, new DataView(data, i * this.stride, this.stride));
		}
		this.clear();
		this.base.setBuffer("ARRAY_BUFFER", this.buffer, data, "DYNAMIC_DRAW");
	}
	clear() { this.vertices.length = 0; }

	/** Automatically places attributes into their spots in layout. */
	static autoLayout<T, const L extends Layout>(
		base: WebGlBase,
		layout: L,
		toAttribs: (vertex: T) => LayoutValues<L>,
	): InterleavedAttribManager<T, L> {
		const serialise: Serialiser<T> = (vertex, view) => {
			const attribs = toAttribs(vertex);
			let offset = 0;
			for (const [name, type] of layout) {
				const val: unknown = attribs[name as never];
				switch (type) {
					case WebGlType.Float: {
						const v = val as WebGlLike.Float;
						view.setFloat32(offset, v, true);
						break;
					}
					case WebGlType.Float2: {
						const v = val as WebGlLike.Float2;
						view.setFloat32(offset, v[0], true);
						view.setFloat32(offset + 4, v[1], true);
						break;
					}
					case WebGlType.Float3: {
						const v = val as WebGlLike.Float3;
						view.setFloat32(offset, v[0], true);
						view.setFloat32(offset + 4, v[1], true);
						view.setFloat32(offset + 8, v[2], true);
						break;
					}
					case WebGlType.Float4: {
						const v = val as WebGlLike.Float4;
						view.setFloat32(offset, v[0], true);
						view.setFloat32(offset + 4, v[1], true);
						view.setFloat32(offset + 8, v[2], true);
						view.setFloat32(offset + 12, v[3], true);
						break;
					}
				}
				offset += WebGlBase.sizeof(type);
			}
		}
		return new InterleavedAttribManager(base, layout, serialise);
	}
}