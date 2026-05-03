export type UnionToIntersection<T> = (
	(T extends unknown
		? (_: T) => void
		: never) extends (value: infer O) => void
	? O
	: unknown
);

/** Flatten object types (1 layer only). */
export type Flatten1<T> = (
	T extends object
	? { [k in keyof T]: T[k]; }
	: T
);
export type Flatten<T> = (
	T extends object
	? { [k in keyof T]: Flatten<T[k]>; }
	: T extends (...args: infer I) => infer O
	? (...args: Flatten<I>) => Flatten<O>
	: T
);