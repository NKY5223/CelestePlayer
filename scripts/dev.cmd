node_modules\.bin\esbuild ^
	bundle=./src/index.ts ^
	packedTexture.worker=./src/atlas/packedTexture.worker.ts ^
	meta.worker=./src/atlas/meta.worker.ts ^
	--outdir=dst --bundle ^
	--serve=2470 --servedir=./ ^
	--sourcemap --format=esm