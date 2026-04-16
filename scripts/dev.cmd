node_modules\.bin\esbuild ^
	bundle=./src/index.ts ^
	atlas_data.worker=./src/atlas/data.worker.ts ^
	atlas_meta.worker=./src/atlas/meta.worker.ts ^
	--outdir=dst --bundle ^
	--serve=2470 --servedir=./ ^
	--sourcemap --format=esm