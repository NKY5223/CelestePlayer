type Flatten<T> = { [k in keyof T]: T[k] };

export type SyncReader<T extends Record<string, unknown>> = {
	[k in keyof T & string as `read${Capitalize<k>}`]: () => T[k];
};
export type AsyncReader<T extends Record<string, unknown>> = {
	[k in keyof T & string as `read${Capitalize<k>}`]: () => Promise<T[k]>;
};

type NumTypes = Flatten<
	& Record<`${"u" | ""}int${8 | 16 | 32}`, number>
	& Record<`big${"u" | ""}int64`, bigint>
	& Record<`float${32 | 64}`, number>
>;
type StrTypes = Flatten<
	& {
		"utf8": string
	}
>;

export type SyncBinNumReader = SyncReader<NumTypes>;
export type AsyncBinNumReader = AsyncReader<NumTypes>;
export type SyncBinStrReader = SyncReader<StrTypes>;
export type AsyncBinStrReader = AsyncReader<StrTypes>;