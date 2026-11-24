using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using static FoldedVision.Editor.FactoryGeometry;

namespace FoldedVision.Editor
{
    internal class FactoryParts
    {
        readonly FactoryGeometry g;
        readonly FactoryPalette p;

        internal FactoryParts(FactoryGeometry geometry, FactoryPalette palette)
        {
            g = geometry;
            p = palette;
        }

        internal GameObject[] Build()
        {
            var lens = Group(null, "Lens · optical module");
            Lens(lens);
            var ring = Group(null, "Ring · machined insert");
            Ring(ring);
            var pcb = Group(null, "PCB · surface mount module");
            Pcb(pcb);
            return new[] { Store(lens, "Lens"), Store(ring, "Ring"), Store(pcb, "PCB") };
        }

        static GameObject Store(Transform root, string name)
        {
            var prefab = PrefabUtility.SaveAsPrefabAsset(root.gameObject, $"{Generated}/Prefabs/{name}.prefab");
            UnityEngine.Object.DestroyImmediate(root.gameObject);
            return prefab;
        }

        void Lens(Transform root)
        {
            g.Turn(root, "Anodized lens barrel", "Precision barrel", default, p.Black, 100, default,
                new(.199f, 0), new(.215f, .009f), new(.215f, .091f), new(.204f, .108f), new(.184f, .108f),
                new(.175f, .091f), new(.175f, .025f), new(.180f, 0), new(.199f, 0));
            g.Turn(root, "Knurled lock collar", "Lens retaining collar", default, p.Steel, 100, default,
                new(.201f, .038f), new(.219f, .044f), new(.219f, .065f), new(.211f, .075f), new(.199f, .073f), new(.201f, .038f));
            g.Turn(root, "Polished front rim", "Optic front rim", default, p.Chrome, 100, default,
                new(.187f, .094f), new(.202f, .106f), new(.200f, .114f), new(.184f, .116f), new(.177f, .110f), new(.187f, .094f));
            g.Turn(root, "Hard stop and baffle", "Inner lens baffle", default, p.Rubber, 80, default,
                new(.178f, .028f), new(.179f, .089f), new(.170f, .096f), new(.162f, .088f),
                new(.165f, .076f), new(.154f, .068f), new(.162f, .057f), new(.158f, .033f), new(.178f, .028f));
            // 두 곡면과 어두운 코팅 요소를 분리해 광학 깊이를 만든다.
            OpticalElement(root, "Rear optical element", .151f, .035f, .028f, .009f, p.OpticDeep);
            OpticalElement(root, "Purple AR coating", .162f, .065f, .022f, .009f, p.Purple);
            OpticalElement(root, "Convex coated glass", .172f, .099f, .038f, .009f, p.GlassBlue);
            for (var i = 0; i < 36; i++)
            {
                var angle = i * 10f;
                g.Box(root, "Collar grip serration", Radial(.218f, .054f, angle),
                    new Vector3(.009f, .019f, .005f), p.Steel, .001f, new Vector3(0, -angle, 0));
            }
            for (var i = 0; i < 3; i++)
                g.Box(root, "Bayonet mounting lug", Radial(.214f, .013f, 30 + i * 120),
                    new Vector3(.044f, .018f, .065f), p.Black, .004f, new Vector3(0, -30 - i * 120, 0));
            g.Combine(root, "Lens lock assembly");
        }

        void OpticalElement(Transform parent, string name, float radius, float height, float curvature, float edge, Material mat)
        {
            var profile = new List<Vector2>();
            for (var i = 0; i <= 12; i++)
            {
                var t = i / 12f;
                profile.Add(new Vector2(radius * t, height - edge - .32f * curvature * (1 - t * t)));
            }
            for (var i = 0; i <= 14; i++)
            {
                var t = 1 - i / 14f;
                profile.Add(new Vector2(radius * t, height + curvature * (1 - t * t)));
            }
            g.Turn(parent, name, name, default, mat, 100, default, profile.ToArray());
        }

        void Ring(Transform root)
        {
            g.Turn(root, "CNC milled annular blank", "Ring stepped bore profile", default, p.Brushed, 110, default,
                new(.179f, 0), new(.189f, .009f), new(.189f, .069f), new(.177f, .082f), new(.164f, .082f),
                new(.161f, .076f), new(.150f, .076f), new(.147f, .082f), new(.124f, .082f), new(.112f, .067f),
                new(.112f, .023f), new(.105f, .018f), new(.105f, .007f), new(.113f, 0), new(.179f, 0));
            g.Turn(root, "Dark groove bottom", "Ring groove inlay", default, p.Black, 100, default,
                new(.161f, .076f), new(.160f, .0765f), new(.151f, .0765f), new(.150f, .076f));
            g.Turn(root, "Reflective bevel", "Ring polished bevel", default, p.Chrome, 102, default,
                new(.188f, .069f), new(.176f, .083f), new(.170f, .083f));
            for (var i = 0; i < 3; i++)
            {
                var angle = 34 + 120 * i;
                g.Cylinder(root, "Radial retaining counterbore", Radial(.176f, .083f, angle), .006f, .0015f, p.Black);
                g.Cylinder(root, "Recess center", Radial(.176f, .084f, angle), .0033f, .001f, p.Steel);
            }
            var overlays = Group(root, "Demo defect overlays");
            var dust = Group(overlays, "t_contamination");
            for (var i = 0; i < 10; i++)
                g.Cylinder(dust, "Deposit cluster", Radial(.128f + i % 4 * .010f, .083f, 48 + i * 2.3f),
                    .004f + i % 4 * .0014f, .0012f, p.Deposit);
            var scratch = Group(overlays, "t_scratch");
            for (var i = 0; i < 3; i++)
                g.Box(scratch, "Fine radial score", new Vector3(.151f, .084f, -.028f + .003f * i),
                    new Vector3(.033f - .003f * i, .0011f, .0017f), p.OffWhite, .0001f, new Vector3(0, 24 + i * 4, 0));
            var unfinished = Group(overlays, "unfinished_surface");
            for (var i = 0; i < 11; i++)
                g.Box(unfinished, "Tool mark line", Radial(.144f + .007f * (i % 4), .0831f, 164 + i * 2.1f),
                    new Vector3(.014f, .0011f, .006f), p.Dull, .0001f, new Vector3(0, 21, 0));
            foreach (Transform child in overlays) child.gameObject.SetActive(false);
        }

        void Pcb(Transform root)
        {
            BuildBoard(root);
            var detail = Group(root, "Copper, packages and connectors");
            const float zOffset = .016f;
            for (var i = 0; i < 18; i++)
            {
                var x = -.17f + .020f * i;
                var from = new Vector3(x, .0163f, .033f + zOffset);
                var mid = from + new Vector3(0, 0, .019f + .007f * (i % 4));
                var end = mid + new Vector3(i % 2 == 0 ? .021f : -.021f, 0, .030f);
                Trace(detail, from, mid);
                Trace(detail, mid, end);
                g.Cylinder(detail, "Plated via", end, .0034f, .0014f, p.Gold, segments: 12);
                g.Cylinder(detail, "Via bore", end + Vector3.up * .001f, .0015f, .0014f, p.Black, segments: 12);
            }
            for (var i = 0; i < 14; i++)
            {
                var x = -.17f + .022f * i;
                var from = new Vector3(x, .0163f, -.045f);
                var mid = from + new Vector3(0, 0, -.036f - .004f * (i % 5));
                Trace(detail, from, mid);
                Trace(detail, mid, mid + new Vector3(.019f, 0, -.017f));
            }
            Chip(detail, new(-.023f, .016f, .009f), .085f, .071f, 10);
            Chip(detail, new(.102f, .016f, -.057f), .048f, .045f, 6);
            Chip(detail, new(-.125f, .016f, -.066f), .031f, .028f, 4);
            for (var i = 0; i < 17; i++)
            {
                var x = -.157f + i % 9 * .036f;
                var z = i < 9 ? .088f : -.106f;
                if (i == 15) continue;
                Passive(detail, "SMD", new Vector3(x, .016f, z), i % 2 == 0 ? p.Carbon : p.Ceramic);
            }
            var optional = Group(root, "Removable component");
            Passive(optional, "C19", new Vector3(.096f, .016f, -.106f), p.Ceramic);
            for (var i = 0; i < 6; i++)
                Passive(detail, "SMD", new Vector3(.099f + .034f * (i % 3), .016f, .027f + .032f * (i / 3)), i % 2 == 0 ? p.Ceramic : p.Carbon);
            g.Box(detail, "Shielded miniature connector", new Vector3(-.182f, .037f, .004f), new Vector3(.069f, .041f, .084f), p.Chrome);
            g.Box(detail, "Connector cavity", new Vector3(-.218f, .038f, .004f), new Vector3(.002f, .021f, .064f), p.Black, .001f);
            for (var i = 0; i < 5; i++)
                g.Box(detail, "Connector contact", new Vector3(-.219f, .033f, -.02f + .011f * i), new Vector3(.002f, .002f, .004f), p.Gold, .0003f);
            g.Box(detail, "FFC socket", new Vector3(.175f, .029f, .019f), new Vector3(.045f, .027f, .095f), p.Ceramic);
            for (var i = 0; i < 12; i++)
                g.Box(detail, "FFC solder tail", new Vector3(.146f, .020f, -.018f + .0066f * i), new Vector3(.012f, .006f, .003f), p.Solder, .0007f);
            for (var i = 0; i < 14; i++)
                g.Box(detail, "Gold edge contact", new Vector3(-.08f + .012f * i, .01645f, .132f),
                    new Vector3(.008f, .0011f, .018f), p.Gold, .00015f);
            Mark(detail, "FV-04  REV B", new Vector3(.048f, .017f, .114f), .017f, TextAnchor.MiddleCenter);
            Mark(detail, "U3", new Vector3(-.077f, .017f, .05f), .013f, TextAnchor.MiddleCenter);
            Mark(detail, "J2", new Vector3(.174f, .017f, -.049f), .013f, TextAnchor.MiddleCenter);
            Mark(detail, "01", new Vector3(-.12f, .017f, .118f), .011f, TextAnchor.MiddleCenter);
            g.Combine(detail, "PCB surface mount");
            BoardDefects(root);
        }

        void BoardDefects(Transform root)
        {
            var overlays = Group(root, "Demo defect overlays");
            var missing = Group(overlays, "pcb4_miss");
            for (var i = 0; i < 2; i++)
                g.Box(missing, "Exposed solder pad", new Vector3(.096f + (i == 0 ? -.010f : .010f), .019f, -.106f),
                    new Vector3(.012f, .002f, .014f), p.Solder, .0005f);
            var damage = Group(overlays, "pcb4_component_damage");
            for (var i = 0; i < 3; i++)
                g.Box(damage, "Fractured package seam", new Vector3(-.040f + i * .012f, .041f, .018f),
                    new Vector3(.018f, .003f, .002f), p.OffWhite, .0002f, new Vector3(0, -35 + 32 * i, 0));
            var foreign = Group(overlays, "pcb4_foreign_material");
            g.Tube(foreign, "Debris fiber", .0022f, p.OffWhite, new(-.12f, .020f, .049f), new(-.099f, .021f, .058f), new(-.085f, .025f, .077f));
            var oxide = Group(overlays, "pcb4_oxidation");
            for (var i = 0; i < 6; i++)
                g.Cylinder(oxide, "Oxide patch", new(-.164f + .005f * i, .058f, .009f + .005f * (i % 3)),
                    .006f, .001f, p.Deposit, segments: 14);
            var scratch = Group(overlays, "pcb4_scratch");
            Trace(scratch, new(.049f, .0183f, -.065f), new(.112f, .0183f, -.090f), p.Chrome);
            foreach (Transform child in overlays) child.gameObject.SetActive(false);
        }

        void BuildBoard(Transform parent)
        {
            var vertices = new List<Vector3>();
            var normals = new List<Vector3>();
            var triangles = new List<int>();
            for (var a = -1; a <= 1; a += 2)
                for (var b = -1; b <= 1; b += 2)
                {
                    var min = new Vector2(a < 0 ? -.218f : 0, b < 0 ? -.144f : 0);
                    var max = new Vector2(a > 0 ? .218f : 0, b > 0 ? .144f : 0);
                    var center = new Vector2(a * .187f, b * .115f);
                    var angles = new List<float>();
                    for (var i = 0; i < 32; i++) angles.Add(2 * Mathf.PI * i / 32);
                    foreach (var x in new[] { min.x, max.x })
                        foreach (var z in new[] { min.y, max.y })
                            angles.Add(Mathf.Repeat(Mathf.Atan2(z - center.y, x - center.x), 2 * Mathf.PI));
                    angles.Sort();
                    for (var i = 0; i < angles.Count; i++)
                    {
                        var current = angles[i];
                        var next = angles[(i + 1) % angles.Count];
                        Vector2 Hole(float angle) => center + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * .009f;
                        Vector2 Edge(float angle)
                        {
                            var v = new Vector2(Mathf.Cos(angle), Mathf.Sin(angle));
                            var x = Mathf.Abs(v.x) < .00001f ? 999 : ((v.x > 0 ? max.x : min.x) - center.x) / v.x;
                            var z = Mathf.Abs(v.y) < .00001f ? 999 : ((v.y > 0 ? max.y : min.y) - center.y) / v.y;
                            return center + v * Mathf.Min(x, z);
                        }
                        var c = Hole(current);
                        var d = Hole(next);
                        var e = Edge(current);
                        var f = Edge(next);
                        void Quad(Vector3 q1, Vector3 q2, Vector3 q3, Vector3 q4, Vector3 normal)
                        {
                            var start = vertices.Count;
                            vertices.AddRange(new[] { q1, q2, q3, q4 });
                            normals.AddRange(new[] { normal, normal, normal, normal });
                            triangles.AddRange(new[] { start, start + 1, start + 2, start, start + 2, start + 3 });
                        }
                        Vector3 V(Vector2 xy, float height) => new(xy.x, height, xy.y);
                        Quad(V(c, .016f), V(d, .016f), V(f, .016f), V(e, .016f), Vector3.up);
                        Quad(V(e, 0), V(f, 0), V(d, 0), V(c, 0), Vector3.down);
                        Quad(V(e, .016f), V(f, .016f), V(f, 0), V(e, 0), new Vector3((f - e).y, 0, -(f - e).x).normalized);
                        Quad(V(c, 0), V(d, 0), V(d, .016f), V(c, .016f), new Vector3(center.x - c.x, 0, center.y - c.y).normalized);
                    }
                    g.Turn(parent, "Plated mounting hole", "PCB hole annulus", new(center.x, .016f, center.y), p.Gold, 44, default,
                        new(.0135f, 0), new(.0135f, .0006f), new(.009f, .0006f), new(.009f, -.004f));
                }
            var mesh = new Mesh { name = "PCB substrate with four through holes" };
            mesh.SetVertices(vertices);
            mesh.SetNormals(normals);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateBounds();
            g.Place(parent, "FR4 substrate with through holes", default, Save(mesh, $"{Generated}/Models/{mesh.name}.asset"), p.Board, default);
        }

        void Trace(Transform parent, Vector3 a, Vector3 b, Material material = null)
        {
            var angle = Mathf.Atan2(b.z - a.z, b.x - a.x) * Mathf.Rad2Deg;
            g.Box(parent, "Etched trace", (a + b) * .5f,
                new Vector3(Vector3.Distance(a, b) + .002f, .0007f, .0023f), material ?? p.Copper, .0001f,
                new Vector3(0, -angle, 0));
        }

        void Chip(Transform parent, Vector3 position, float width, float length, int count)
        {
            g.Box(parent, "Molded IC package", position + Vector3.up * .014f, new(width, .023f, length), p.Carbon, .004f);
            g.Cylinder(parent, "Pin 1 marker", position + new Vector3(-width * .32f, .026f, length * .32f), .004f, .001f, p.Dull);
            for (var i = 0; i < count; i++)
                foreach (var sign in new[] { -1, 1 })
                {
                    var x = position.x + (i - (count - 1) / 2f) * width / count * .91f;
                    g.Box(parent, "IC gullwing lead", new Vector3(x, .022f, position.z + sign * (length / 2 + .005f)),
                        new Vector3(.004f, .008f, .014f), p.Solder, .001f);
                    g.Box(parent, "Solder toe pad", new Vector3(x, .017f, position.z + sign * (length / 2 + .009f)),
                        new Vector3(.006f, .002f, .011f), p.Gold, .0003f);
                }
        }

        void Passive(Transform parent, string name, Vector3 position, Material body)
        {
            for (var sign = -1; sign < 2; sign += 2)
            {
                g.Box(parent, $"{name} solder pad", position + new Vector3(sign * .010f, .001f, 0),
                    new Vector3(.010f, .002f, .013f), p.Solder, .0005f);
                g.Box(parent, $"{name} contact", position + new Vector3(sign * .008f, .006f, 0),
                    new Vector3(.008f, .008f, .010f), p.Chrome, .001f);
            }
            g.Box(parent, $"{name} passive body", position + Vector3.up * .006f, new(.013f, .009f, .011f), body, .001f);
        }

        internal static Vector3 Radial(float radius, float y, float degrees)
        {
            var a = degrees * Mathf.Deg2Rad;
            return new Vector3(Mathf.Cos(a) * radius, y, Mathf.Sin(a) * radius);
        }

        internal static void Mark(Transform root, string value, Vector3 location, float size, TextAnchor anchor, Vector3? rotation = null, Color? tint = null)
        {
            var tag = Group(root, "Marking / " + value.Replace("\n", " "), location);
            tag.localRotation = Quaternion.Euler(rotation ?? new Vector3(90, 0, 0));
            var text = tag.gameObject.AddComponent<TextMesh>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (text.font != null) tag.GetComponent<MeshRenderer>().sharedMaterial = text.font.material;
            text.text = value;
            text.fontSize = 36;
            text.characterSize = size * .29f;
            text.anchor = anchor;
            text.alignment = TextAlignment.Center;
            text.fontStyle = FontStyle.Bold;
            text.color = tint ?? new Color(.84f, .91f, .93f);
            var renderer = tag.GetComponent<MeshRenderer>();
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            renderer.receiveShadows = false;
        }
    }
}
