type Flatten<T> = { [k in keyof T]: T[k] };

type NumTypes = Flatten<
	& Record<`${"u" | ""}int${8 | 16 | 32}`, number>
	& Record<`big${"u" | ""}int64`, bigint>
	& Record<`float${32 | 64}`, number>
>;
export type SyncBinNumReader = {
	[k in keyof NumTypes as `read${Capitalize<k>}`]: () => NumTypes[k];
};
export type AsyncBinNumReader = {
	[k in keyof NumTypes as `read${Capitalize<k>}`]: () => Promise<NumTypes[k]>;
};