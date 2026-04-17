using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Xml;
using Microsoft.Xna.Framework;

namespace Monocle;

public class SpriteData
{
    public List<SpriteDataSource> Sources = new List<SpriteDataSource>();

    public Sprite Sprite;

    public Atlas Atlas;

    [MethodImpl(MethodImplOptions.NoInlining)]
    public SpriteData(Atlas atlas)
    {
        Sprite = new Sprite(atlas, "");
        Atlas = atlas;
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    public void Add(XmlElement xml, string overridePath = null)
    {
        SpriteDataSource spriteDataSource = new SpriteDataSource();
        spriteDataSource.XML = xml;
        spriteDataSource.Path = xml.Attr("path");
        spriteDataSource.OverridePath = overridePath;
        string text = "Sprite '" + xml.Name + "': ";
        if (!xml.HasAttr("path") && string.IsNullOrEmpty(overridePath))
        {
            throw new Exception(text + "'path' is missing!");
        }
        HashSet<string> animNames = new HashSet<string>();
        foreach (XmlElement Anim in xml.GetElementsByTagName("Anim"))
        {
            CheckAnimXML(Anim, text, animNames);
        }
        foreach (XmlElement Loop in xml.GetElementsByTagName("Loop"))
        {
            CheckAnimXML(Loop, text, animNames);
        }
        if (xml.HasAttr("start") && !animNames.Contains(xml.Attr("start")))
        {
            throw new Exception(text + "starting animation '" + xml.Attr("start") + "' is missing!");
        }
        if (xml.HasChild("Justify") && xml.HasChild("Origin"))
        {
            throw new Exception(text + "has both Origin and Justify tags!");
        }
        string rootPath = xml.Attr("path", "");
        float defaultValue = xml.AttrFloat("delay", 0f);
        foreach (XmlElement Anim in xml.GetElementsByTagName("Anim"))
        {
            Chooser<string> chooser = (!Anim.HasAttr("goto")) ? null : Chooser<string>.FromString<string>(Anim.Attr("goto"));
            string id = Anim.Attr("id");
            string path = Anim.Attr("path", "");
            int[] frames = Calc.ReadCSVIntWithTricks(Anim.Attr("frames", ""));
            path = (string.IsNullOrEmpty(overridePath) || !HasFrames(Atlas, overridePath + path, frames)) ? (rootPath + path) : (overridePath + path);
            Sprite.Add(id, path, Anim.AttrFloat("delay", defaultValue), chooser, frames);
        }
        foreach (XmlElement Loop in xml.GetElementsByTagName("Loop"))
        {
            string id2 = Loop.Attr("id");
            string path = Loop.Attr("path", "");
            int[] frames2 = Calc.ReadCSVIntWithTricks(Loop.Attr("frames", ""));
            path = (string.IsNullOrEmpty(overridePath) || !HasFrames(Atlas, overridePath + path, frames2)) ? (rootPath + path) : (overridePath + path);
            Sprite.AddLoop(id2, path, Loop.AttrFloat("delay", defaultValue), frames2);
        }
        if (xml.HasChild("Center"))
        {
            Sprite.CenterOrigin();
            Sprite.Justify = new Vector2(0.5f, 0.5f);
        }
        else if (xml.HasChild("Justify"))
        {
            Sprite.JustifyOrigin(xml.ChildPosition("Justify"));
            Sprite.Justify = xml.ChildPosition("Justify");
        }
        else if (xml.HasChild("Origin"))
        {
            Sprite.Origin = xml.ChildPosition("Origin");
        }
        if (xml.HasChild("Position"))
        {
            Sprite.Position = xml.ChildPosition("Position");
        }
        if (xml.HasAttr("start"))
        {
            Sprite.Play(xml.Attr("start"));
        }
        Sources.Add(spriteDataSource);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private bool HasFrames(Atlas atlas, string path, int[] frames = null)
    {
        atlas.PushFallback(null);
        bool result = orig_HasFrames(atlas, path, frames);
        atlas.PopFallback();
        return result;
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private void CheckAnimXML(XmlElement xml, string prefix, HashSet<string> ids)
    {
        if (!xml.HasAttr("id"))
        {
            throw new Exception(prefix + "'id' is missing on " + xml.Name + "!");
        }
        if (ids.Contains(xml.Attr("id")))
        {
            throw new Exception(prefix + "multiple animations with id '" + xml.Attr("id") + "'!");
        }
        ids.Add(xml.Attr("id"));
    }

    public Sprite Create()
    {
        return Sprite.CreateClone();
    }

    public Sprite CreateOn(Sprite sprite)
    {
        return Sprite.CloneInto(sprite);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private bool orig_HasFrames(Atlas atlas, string path, int[] frames = null)
    {
        if (frames == null || frames.Length == 0)
        {
            return atlas.GetAtlasSubtexturesAt(path, 0) != null;
        }
        for (int i = 0; i < frames.Length; i++)
        {
            if (atlas.GetAtlasSubtexturesAt(path, frames[i]) == null)
            {
                return false;
            }
        }
        return true;
    }
}
