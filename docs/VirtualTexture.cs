// this code is taken from (a decomp of) (everest-modified) monocle's `VirtualTexture.cs`.
// it loads `.data` files into textures.
// Notes:
// bytes are in ABGR order
// * if not in transparency mode, BGR order
// if A is 0, short circuit to #0000


using (FileStream fileStream = File.OpenRead(System.IO.Path.Combine(Engine.ContentDirectory, Path)))
{
	byte[] chunk = bytesSafe ?? (bytesSafe = new byte[524288]);
	fileStream.Read(chunk, 0, chunk.Length);
	int chunkIdx = 0;
	int w = BitConverter.ToInt32(chunk, chunkIdx);
	int h = BitConverter.ToInt32(chunk, chunkIdx + 4);
	// if false, treat image as opaque
	bool transparency = chunk[chunkIdx + 8] == 1;
	chunkIdx += 9;
	base.Width = w;
	base.Height = h;
	int size = w * h * 4;
	// probably speeding up reading of 4096 × 4096 textures
	if (size == 67108864)
	{
		lock (bufferLock)
		{
			buffer = bufferSafe;
			bufferSafe = null;
			bufferStolen = true;
			bufferGC = true;
		}
	}
	if (buffer == null)
	{
		if (bufferGC)
		{
			buffer = new byte[size];
		}
		else
		{
			buffer = null;
			bufferPtr = Marshal.AllocHGlobal(size);
		}
		bufferStolen = false;
	}
	fixed (byte* chunkPtr = chunk)
	{
		fixed (byte* bufPtr = buffer)
		{
			byte* bufPtr = (bufferGC ? bufPtr : ((byte*)bufPtr));
			int* bufPtr = (int*)bufPtr;
			uint bufOffset = 0u;
			uint pixelIdx = 0u;
			if (transparency)
			{
				while (bufOffset < size)
				{
					uint repeats = chunkPtr[chunkIdx];
					byte alpha = chunkPtr[chunkIdx + 1];
					if (alpha > 0)
					{
						bufPtr[bufOffset] = chunkPtr[chunkIdx + 4];
						bufPtr[bufOffset + 1] = chunkPtr[chunkIdx + 3];
						bufPtr[bufOffset + 2] = chunkPtr[chunkIdx + 2];
						bufPtr[bufOffset + 3] = alpha;
						chunkIdx += 5;
					}
					else
					{
						bufPtr[pixelIdx] = 0;
						chunkIdx += 2;
					}
					if (repeats > 1)
					{
						if (alpha == 0)
						{
							// set necessary bytes to transparent
							// IL initblk instruction
							Unsafe.InitBlock(bufPtr + bufOffset + 4, 0, repeats * 4 - 4);
						}
						else
						{
							// copy from previous repeats
							uint i = pixelIdx + 1;
							for (uint end = pixelIdx + repeats; i < end; i++)
							{
								bufPtr[i] = bufPtr[pixelIdx];
							}
						}
					}
					pixelIdx += repeats;
					bufOffset = pixelIdx * 4;
					// chunk about to end, read the next one, preserving any leftover values
					if (chunkIdx > chunk.Length - 32)
					{
						int remaining = chunk.Length - chunkIdx;
						for (int i = 0; i < remaining; i++)
						{
							chunkPtr[i] = chunkPtr[chunkIdx + i];
						}
						fileStream.Read(chunk, remaining, chunk.Length - remaining);
						chunkIdx = 0;
					}
				}
			}
			else
			{
				while (bufOffset < size)
				{
					uint repeats = chunkPtr[chunkIdx];
					bufPtr[bufOffset] = chunkPtr[chunkIdx + 3];
					bufPtr[bufOffset + 1] = chunkPtr[chunkIdx + 2];
					bufPtr[bufOffset + 2] = chunkPtr[chunkIdx + 1];
					bufPtr[bufOffset + 3] = byte.MaxValue;
					chunkIdx += 4;
					if (repeats > 1)
					{
						// weird order probably from decompilation
						uint i = pixelIdx + 1;
						for (uint end = pixelIdx + repeats; i < end; i++)
						{
							bufPtr[i] = bufPtr[pixelIdx];
						}
					}
					pixelIdx += repeats;
					bufOffset = pixelIdx * 4;
					// ???? this is 0x7ffe0, or 0x80000 - 32
					// why does it use 0x80000 instead of chunk.Length??
					if (chunkIdx > 524256)
					{
						int end = chunk.Length - chunkIdx;
						for (int i = 0; i < end; i++)
						{
							chunkPtr[i] = chunkPtr[chunkIdx + i];
						}
						fileStream.Read(chunk, end, chunk.Length - end);
						chunkIdx = 0;
					}
				}
			}
		}
	}
}