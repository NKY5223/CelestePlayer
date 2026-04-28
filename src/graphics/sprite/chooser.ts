export type Choice<T> = {
	value: T;
	/** Should be positive. */
	weight: number;
}

export const chooser = <T>(choices: Choice<T>[]): () => T => {
	const totalWeight = choices.map(c => c.weight).reduce((a, b) => a + b, 0);
	if (choices.length === 0) {
		throw new Error("At least one choice must be provided.");
	}
	if (choices.some(c => c.weight < 0)) {
		throw new Error("Choice cannot have negative weight.");
	}
	if (totalWeight <= 0 || !isFinite(totalWeight)) {
		throw new Error("Total weight must be positive and finite.");
	}
	if (choices.length === 1) {
		const value = choices[0].value;
		return () => value;
	}
	return () => {
		let i = Math.random() * totalWeight;
		for (const c of choices) {
			i -= c.weight;
			if (i < 0) return c.value;
		}
		throw "unreachable!";
	}
}
/**
 * Expects `str` of format `choice1[:weight1]?,choice2[:weight2]?...`.
 * Choices with no weight attached get a weight of 1.
 */
export const chooserFromString = <T>(str: string, parse: (str: string) => T): () => T => {
	// if (str.includes("ice")) debugger;
	const parts = str.split(",");
	return chooser(parts.map((s): Choice<T> => {
		const idx = s.lastIndexOf(":");
		if (idx < 0) {
			const value = parse(s);
			return { value, weight: 1 };
		}
		const wgtStr = s.slice(idx + 1);
		const weight = parseFloat(wgtStr);
		if (!isFinite(weight) || weight < 0) {
			throw new Error(`Malformed weight string '${wgtStr}' in '${s}', '${str}'.`);
		}
		const value = parse(s.slice(0, idx));
		return { value, weight };
	}));
}