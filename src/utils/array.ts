export const zipWithDefault = <T1, T2, U>(
	as: readonly T1[], bs: readonly T2[], 
	defaultA: T1, defaultB: T2, 
	f: (a: T1, b: T2) => U,
): U[] => {
	const length = Math.max(as.length, bs.length);
	const array = new Array<U>(length);
	for (let i = 0; i < length; i++) array[i] = f(
		i < as.length ? as[i] : defaultA,
		i < bs.length ? bs[i] : defaultB,
	);

	return array;
}

export const zipDefault = <T1, T2>(
	as: readonly T1[], bs: readonly T2[], 
	defaultA: T1, defaultB: T2,
): [a: T1, b: T2][] => zipWithDefault(as, bs, defaultA, defaultB, (a, b) => [a, b]);