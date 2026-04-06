import { BaseBinaryStreamReader } from "./binary/streamReader.js";

declare const file: File;
using reader = new BaseBinaryStreamReader(file.stream());