using UnityEditor;
using UnityEngine;
using static FoldedVision.Editor.FactoryGeometry;

namespace FoldedVision.Editor
{
    internal class FactoryPalette
    {
        internal readonly Material Steel, Brushed, Chrome, Black, Rubber, Belt, OffWhite, Panel, DarkPanel,
            Floor, Base, Wall, Guard, Safety, Teal, TealLamp, Signal, Screen, Overhead,
            GlassBlue, GlassGuard, OpticDeep, Purple, Gold, Copper, Solder, Board, Ceramic, Carbon, Deposit, Dull,
            Green, Red, Amber;

        internal FactoryPalette()
        {
            Steel = M("Satin extruded aluminum", "9CABAE", .74f, .47f);
            Brushed = M("Turned stainless steel", "A8B4BD", .81f, .67f);
            Brushed.SetTexture("_BaseMap", Pattern("Machining grain", 128, (x, y) =>
                Gray(.87f + .07f * Mathf.Sin(y * 2.095f) + .025f * Grain(x, y))));
            Brushed.SetTextureScale("_BaseMap", new Vector2(5, 4));
            Chrome = M("Polished nickel", "D5DFE3", .87f, .83f);
            Black = M("Graphite anodized aluminum", "28333D", .54f, .46f);
            Rubber = M("Black elastomer", "18242B", .03f, .23f);
            Belt = M("Textured transport belt", "343F44", .09f, .25f);
            Belt.SetTexture("_BaseMap", Pattern("Belt tread", 128, (x, y) =>
                Gray(.78f + .08f * Grain(x, y) + .14f * Mathf.SmoothStep(0, 1, (x % 32) / 31f))));
            OffWhite = M("Inspection enamel", "DFE7E7", .11f, .40f);
            Panel = M("Cool grey cabinet powder coat", "A8B8BF", .24f, .43f);
            DarkPanel = M("Midnight equipment panels", "375161", .29f, .38f);
            Floor = M("Fine-textured epoxy", "566970", .17f, .40f);
            Floor.SetTexture("_BaseMap", Pattern("Epoxy stipple", 128, (x, y) => Gray(.88f + Grain(x, y) * .12f)));
            Floor.SetTextureScale("_BaseMap", new Vector2(26, 22));
            Base = M("Cutaway plinth", "303E4A", .39f, .29f);
            Wall = M("Acoustic wall panels", "778991", .24f, .27f);
            Guard = M("Safety screen graphite", "374650", .51f, .40f);
            Safety = M("Safety yellow", "E9BA4E", .22f, .41f);
            Teal = M("Vision teal trim", "0C8890", .42f, .5f);
            TealLamp = M("Coaxial LED", "52C7CC", .17f, .39f, new Color(.08f, .55f, .57f));
            Signal = M("Stack light active", "6DCBCD", .19f, .4f, new Color(.08f, .45f, .47f));
            Screen = M("HMI illuminated display", "164353", .12f, .76f, new Color(.04f, .22f, .29f));
            Overhead = M("Neutral white LED diffuser", "E9F6FF", .02f, .3f, new Color(.68f, .93f, 1f) * 2.5f);
            GlassBlue = M("Optical glass with cyan coating", "5899CF66", .23f, .93f);
            GlassGuard = M("Tinted polycarbonate guard", "80ADBD2B", .08f, .78f);
            OpticDeep = M("Deep blue optical element", "14263C", .37f, .91f);
            Purple = M("Magenta antireflection film", "5B59AF77", .41f, .92f);
            foreach (var item in new[] { GlassBlue, GlassGuard, Purple }) MakeGlass(item);
            Gold = M("ENIG gold", "E0B163", .73f, .57f);
            Copper = M("Copper traces", "A8844C", .55f, .5f);
            Solder = M("Tin solder", "A8BCC1", .82f, .56f);
            Board = M("Forest green solder mask", "146453", .11f, .54f);
            Ceramic = M("Ceramic capacitors", "B3A17D", .09f, .25f);
            Carbon = M("IC epoxy mold compound", "202A32", .03f, .26f);
            Deposit = M("Foreign deposit illustration", "574334", .03f, .22f);
            Dull = M("Unfinished granular face", "5A6061", .53f, .18f);
            Green = M("Pass lane green", "3CA477", .22f, .38f);
            Red = M("Quarantine red", "BC5150", .22f, .38f);
            Amber = M("Reinspection amber", "DB9748", .22f, .38f);
            AssetDatabase.SaveAssets();
        }

        static Material M(string name, string hex, float metal, float smooth, Color emission = default)
        {
            ColorUtility.TryParseHtmlString("#" + hex, out var value);
            return Material(name, value, metal, smooth, emission);
        }

        static Color Gray(float value) => new(value, value, value, 1);
        static float Grain(int x, int y) => Mathf.Repeat(Mathf.Sin(x * 13.3521f + y * 79.117f) * 15758.544f, 1f);

        static Texture2D Pattern(string name, int size, System.Func<int, int, Color> sample)
        {
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, true) { name = name };
            var pixels = new Color[size * size];
            for (var y = 0; y < size; y++)
                for (var x = 0; x < size; x++)
                    pixels[y * size + x] = sample(x, y);
            texture.SetPixels(pixels);
            texture.wrapMode = TextureWrapMode.Repeat;
            texture.filterMode = FilterMode.Trilinear;
            texture.anisoLevel = 4;
            texture.Apply();
            return Save(texture, $"{Generated}/Textures/{name}.asset");
        }
    }
}
