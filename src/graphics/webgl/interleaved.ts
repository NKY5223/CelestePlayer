import { Flatten1, UnionToIntersection } from "../../utils/types.js";
import { WebGlBase, WebGlLike, WebGlType } from "./base.js";

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
	protected readonly batch: T[] = [];

	constructor(
		readonly base: WebGlBase,
		readonly layout: L,
		readonly serialise: Serialiser<T>,
	) {
		this.bindAttribs();
	}
	readonly gl = this.base.gl;
	readonly buffer: WebGLBuffer = this.gl.createBuffer();
	/** Total byte width of layout. */
	readonly stride = this.layout.reduce((acc, [, type]) => acc + WebGlBase.sizeof(type), 0);

	bindAttribs() {
		let offset = 0;
		for (const [name, type] of this.layout) {
			this.base.setAttribBuffer(name, this.buffer, type, false, this.stride, offset);
			offset += WebGlBase.sizeof(type);
		}
	}

	addVertex(vertex: T) { this.batch.push(vertex); }
	addVertices(vertices: readonly T[]) { this.batch.push(...vertices); }
	/** Flushes the batch into the buffer, **replacing** its contents. */
	flush() {
		const data = new ArrayBuffer(this.batch.length * this.stride);
		for (const [i, vertex] of this.batch.entries()) {
			this.serialise(vertex, new DataView(data, i * this.stride, this.stride));
		}
		this.clearBatch();
		this.base.setBuffer(this.buffer, data, "DYNAMIC_DRAW");
	}
	clearBatch() { this.batch.length = 0; }

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