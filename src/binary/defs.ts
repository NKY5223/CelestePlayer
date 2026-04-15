type Flatten<T> = { [k in keyof T]: T[k] };

export type Reader<T extends Record<string, unknown>> = {
	[k in keyof T & string as `read${Capitalize<k>}`]:
	T[k] extends (...args: infer I) => infer O
	? (...args: I) => O
	: () => T[k];
};
export type AsyncReader<T extends Record<string, unknown>> = {
	[k in keyof T & string as `read${Capitalize<k>}`]:
	T[k] extends (...args: infer I) => infer O
	? (...args: I) => Promise<O>
	: () => Promise<T[k]>;
};

type NumTypes = Flatten<
	& Record<`${"u" | ""}int${8 | 16 | 32}`, number>
	& Record<`big${"u" | ""}int64`, bigint>
	& Record<`float${32 | 64}`, number>
>;
type Str = {
	"string": string;
};
type VarLen = {
	/** {@link https://learn.microsoft.com/en-us/dotnet/api/system.io.binarywriter.write7bitencodedint?view=net-10.0} */
	"varlenInt": number;
};
type Bytes = {
	"bytes": (count: number) => AllowSharedBufferSource;
};

export type BinNumReader = Reader<NumTypes>;
export type AsyncBinNumReader = AsyncReader<NumTypes>;
export type BinStrReader = Reader<Str>;
export type AsyncBinStrReader = AsyncReader<Str>;
export type BinVarLenReader = Reader<VarLen>;
export type AsyncBinVarLenReader = AsyncReader<VarLen>;
export type BinBytesReader = Reader<Bytes>;
export type AsyncBinBytesReader = AsyncReader<Bytes>;

export const readVarlenInt = (reader: BinNumReader) => {
	let i = 0;
	while (true) {
		const byte = reader.readUint8();
		const high = byte >> 7;
		const low = byte & 0b01111111;
		i = i << 8 | low;
		if (!high) return i;
	}
}
export const readVarlenIntAsync = async (reader: AsyncBinNumReader) => {
	let i = 0;
	while (true) {
		const byte = await reader.readUint8();
		const high = byte >> 7;
		const low = byte & 0b01111111;
		i = i << 8 | low;
		if (!high) return i;
	}
}
const utf8Decoder = new TextDecoder();
export const readString = (reader: BinVarLenReader & BinBytesReader) => {
	const len = reader.readVarlenInt();
	const buf = reader.readBytes(len);
	return utf8Decoder.decode(buf);
}