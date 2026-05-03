node_modules\.bin\esbuild ^
	bundle=./src/index.ts ^
	atlas_data.worker=./src/graphics/atlas/data.worker.ts ^
	atlas_meta.worker=./src/graphics/atlas/meta.worker.ts ^
	--loader:.vert=text ^
	--loader:.frag=text ^
	--loader:.png=dataurl ^
	--outdir=dst --bundle ^
	--serve=2470 --servedir=./ ^
	--sourcemap --format=esm