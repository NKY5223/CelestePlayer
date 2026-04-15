using FileStream metaF = File.OpenRead(text + ".meta");
using BinaryReader reader = new BinaryReader(metaF);
reader.ReadInt32();
reader.ReadString();
reader.ReadInt32();
short textureCount = reader.ReadInt16();
for (int n = 0; n < textureCount; n++)
{
	VirtualTexture virtualTexture = VirtualContent.CreateTexture(Path.Combine(Path.GetDirectoryName(path), reader.ReadString() + ".data"));
	MTexture mTexture = new MTexture(virtualTexture);
	mTexture.Atlas = atlas2;
	atlas2.Sources.Add(virtualTexture);
	short num11 = reader.ReadInt16();
	for (int num12 = 0; num12 < num11; num12++)
	{
		string path = reader.ReadString().Replace('\\', '/');
		short sx = reader.ReadInt16();
		short sy = reader.ReadInt16();
		short sw = reader.ReadInt16();
		short sh = reader.ReadInt16();
		short cx = reader.ReadInt16();
		short cy = reader.ReadInt16();
		short w = reader.ReadInt16();
		short h = reader.ReadInt16();
		atlas2.textures[path] = new MTexture(mTexture, path, new Rectangle(sx, sy, sw, sh), new Vector2(-cx, -cy), w, h);
	}
}
if (metaF.Position < metaF.Length && reader.ReadString() == "LINKS")
{
	short num15 = reader.ReadInt16();
	for (int num16 = 0; num16 < num15; num16++)
	{
		string key2 = reader.ReadString();
		string value2 = reader.ReadString();
		atlas2.links.Add(key2, value2);
	}
}
break;