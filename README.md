playback for stateexporter files
this project is really object-oriented because c# is.

The fallback texture (assets/fallback-16.png) is from Everest.

## how to build
just use `npm run dev` idk
you also need `assets/Graphics` to be like celeste's `Content/Graphics`
(specifically, Gameplay atlas and Sprites spritesheet) 

if ur not on windows and want to build it uhhhh just rewrite build.cmd / dev.cmd or smth idk

## workers.
why the hell can't i make ts apply webworker types to just `.worker.ts`
i have to do some stupid /// stuff just to get the worker files to stop complaining
and then the LIB DECLARATION FILES START YELLING AT ME FUCK YOU
if only workers didn't like. use the same names as window but with different types
can't even do some casting stuff because guess what you have to use the worker lib
to get the worker types in the first place so i'd have to copy!!! the worker types.