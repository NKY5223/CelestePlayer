import { Vector2 } from "./vector2.js";

/** Like {@linkcode parseFloat}, but will return `null` instead of `NaN`. */
export const tryParseFloat = (str: string | null | undefined): number | null => {
	if (str == null) return null;
	const x = parseFloat(str);
	if (isNaN(x)) return null;
	return x;
}
/** Like {@linkcode parseInt}, but will return `null` instead of `NaN`. */
export const tryParseInt = (str: string | null | undefined): number | null => {
	if (str == null) return null;
	const n = parseInt(str, 10);
	if (isNaN(n)) return null;
	return n;
}

/** Treats string as comma-seperated pair of floats. */
export const parseVector2 = (str: string | null | undefined): Vector2 | null => {
	if (str == null) return null;
	const [xS, yS] = str.split(",");
	const x = tryParseInt(xS);
	if (x === null) return null;
	const y = tryParseInt(yS);
	if (y === null) return null;
	return new Vector2(x, y);
}
/** Gets the `x` and `y` attributes of an element and returns a {@linkcode Vector2} (or null if element/number invalid) */
export const parseXmlVector2 = (xml: Element): Vector2 | null => {
	const x = tryParseFloat(xml.getAttribute("x"));
	if (x === null) return null;
	const y = tryParseFloat(xml.getAttribute("y"));
	if (y === null) return null;
	return new Vector2(x, y);
}