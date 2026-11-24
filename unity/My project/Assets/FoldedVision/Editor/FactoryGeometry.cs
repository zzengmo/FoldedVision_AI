using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace FoldedVision.Editor
{
    internal class FactoryGeometry
    {
        internal const string Root = "Assets/FoldedVision", Generated = Root + "/Generated";
        readonly Dictionary<string, Mesh> meshes = new();
        int tubeCount;

        internal static Transform Group(Transform parent, string name, Vector3 location = default)
        {
            var transform = new GameObject(name).transform;
            transform.SetParent(parent, false);
            transform.localPosition = location;
            return transform;
        }

        internal static T Save<T>(T item, string path) where T : UnityEngine.Object
        {
            var existing = AssetDatabase.LoadAssetAtPath<T>(path);
            if (existing != null)
            {
                EditorUtility.CopySerialized(item, existing);
                UnityEngine.Object.DestroyImmediate(item);
                EditorUtility.SetDirty(existing);
                return existing;
            }
            AssetDatabase.CreateAsset(item, path);
            return item;
        }

        internal static Material Material(string name, Color color, float metallic, float smooth, Color emission = default)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) throw new InvalidOperationException("URP Lit shader is unavailable.");
            var mat = new Material(shader) { name = name, color = color, enableInstancing = true };
            mat.SetFloat("_Metallic", metallic);
            mat.SetFloat("_Smoothness", smooth);
            if (emission.maxColorComponent > 0)
            {
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", emission);
                mat.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None;
            }
            return Save(mat, $"{Generated}/Materials/{name}.mat");
        }

        internal static void MakeGlass(Material mat)
        {
            mat.SetFloat("_Surface", 1);
            mat.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
            mat.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
            mat.SetFloat("_SrcBlendAlpha", 1);
            mat.SetFloat("_DstBlendAlpha", (float)BlendMode.OneMinusSrcAlpha);
            mat.SetFloat("_ZWrite", 0);
            mat.SetOverrideTag("RenderType", "Transparent");
            mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            mat.renderQueue = (int)RenderQueue.Transparent;
        }

        internal Transform Box(Transform parent, string name, Vector3 location, Vector3 size, Material mat,
            float bevel = .012f, Vector3 euler = default)
        {
            var key = $"Box {size.x:0.###} {size.y:0.###} {size.z:0.###} {bevel:0.###}".Replace(',', '.');
            if (!meshes.TryGetValue(key, out var mesh))
            {
                mesh = MakeBox(key, size, bevel);
                meshes.Add(key, mesh);
            }
            return Place(parent, name, location, mesh, mat, euler);
        }

        internal Transform Cylinder(Transform parent, string name, Vector3 location, float radius, float length,
            Material mat, Vector3 euler = default, int segments = 24)
        {
            var key = $"Cylinder {radius:0.###} {length:0.###} {segments}".Replace(',', '.');
            var chamfer = Mathf.Min(radius * .1f, length * .19f);
            return Turn(parent, name, key, location, mat, segments, euler,
                new(0, -length / 2), new(radius - chamfer, -length / 2), new(radius, -length / 2 + chamfer),
                new(radius, length / 2 - chamfer), new(radius - chamfer, length / 2), new(0, length / 2));
        }

        internal Transform Turn(Transform parent, string label, string key, Vector3 location, Material material,
            int segments, Vector3 euler, params Vector2[] profile)
        {
            if (!meshes.TryGetValue(key, out var mesh))
            {
                mesh = MakeLathe(key, profile, segments);
                meshes.Add(key, mesh);
            }
            return Place(parent, label, location, mesh, material, euler);
        }

        internal Transform Tube(Transform parent, string name, float radius, Material mat, params Vector3[] path)
        {
            var key = $"{name} {++tubeCount:000}";
            var positions = new List<Vector3>();
            var normals = new List<Vector3>();
            var triangles = new List<int>();
            const int sides = 8;
            for (var i = 0; i < path.Length; i++)
            {
                var tangent = (path[Mathf.Min(i + 1, path.Length - 1)] - path[Mathf.Max(i - 1, 0)]).normalized;
                var right = Vector3.Cross(tangent, Vector3.up).normalized;
                if (right.sqrMagnitude < .01f) right = Vector3.right;
                var up = Vector3.Cross(right, tangent).normalized;
                for (var j = 0; j < sides; j++)
                {
                    var angle = j * 2 * Mathf.PI / sides;
                    var n = Mathf.Cos(angle) * right + Mathf.Sin(angle) * up;
                    positions.Add(path[i] + n * radius);
                    normals.Add(n);
                    if (i == 0) continue;
                    var a = (i - 1) * sides + j;
                    var b = (i - 1) * sides + (j + 1) % sides;
                    triangles.AddRange(new[] { a, b + sides, b, a, a + sides, b + sides });
                }
            }
            return Place(parent, name, default, MeshAsset(key, positions, normals, null, triangles), mat, default);
        }

        internal Transform Surface(Transform parent, string name, Vector3 position, float length, float width, Material material, float tile)
        {
            var key = $"Surface {length} {width} {tile}".Replace(',', '.');
            if (!meshes.TryGetValue(key, out var mesh))
            {
                mesh = MeshAsset(key, new[] { new Vector3(-length / 2, 0, -width / 2), new Vector3(-length / 2, 0, width / 2),
                    new Vector3(length / 2, 0, -width / 2), new Vector3(length / 2, 0, width / 2) },
                    new[] { Vector3.up, Vector3.up, Vector3.up, Vector3.up },
                    new[] { new Vector2(0, 0), new Vector2(0, 1), new Vector2(length / tile, 0), new Vector2(length / tile, 1) },
                    new[] { 0, 1, 2, 1, 3, 2 });
                meshes.Add(key, mesh);
            }
            return Place(parent, name, position, mesh, material, default);
        }

        internal Transform Place(Transform parent, string label, Vector3 pos, Mesh mesh, Material mat, Vector3 euler)
        {
            var node = Group(parent, label, pos);
            node.localRotation = Quaternion.Euler(euler);
            node.gameObject.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = node.gameObject.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = mat;
            if (mesh.bounds.size.sqrMagnitude < .3f || mat.renderQueue >= 3000)
                renderer.shadowCastingMode = ShadowCastingMode.Off;
            return node;
        }

        // 정지된 조립품은 재질별로 묶어 작은 나사와 프레임이 렌더 명령을 늘리지 않게 한다.
        internal void Combine(Transform root, string key)
        {
            var groups = new Dictionary<Material, List<MeshFilter>>();
            foreach (var filter in root.GetComponentsInChildren<MeshFilter>())
            {
                var renderer = filter.GetComponent<MeshRenderer>();
                var mat = renderer.sharedMaterial;
                if (mat == null || mat.renderQueue >= (int)RenderQueue.Transparent) continue;
                if (!groups.TryGetValue(mat, out var group)) groups.Add(mat, group = new());
                group.Add(filter);
            }
            foreach (var (mat, group) in groups)
            {
                if (group.Count < 3) continue;
                var mesh = new Mesh { name = $"{key} {mat.name}", indexFormat = IndexFormat.UInt32 };
                var parts = new CombineInstance[group.Count];
                for (var i = 0; i < group.Count; i++)
                    parts[i] = new CombineInstance
                    {
                        mesh = group[i].sharedMesh,
                        transform = root.worldToLocalMatrix * group[i].transform.localToWorldMatrix
                    };
                mesh.CombineMeshes(parts, true, true);
                var saved = Save(mesh, $"{Generated}/Models/{mesh.name}.asset");
                Place(root, mat.name + " / combined", Vector3.zero, saved, mat, default);
                foreach (var filter in group) filter.gameObject.GetComponent<MeshRenderer>().enabled = false;
            }
        }

        static Mesh MakeBox(string key, Vector3 size, float bevel)
        {
            var half = size / 2;
            bevel = Mathf.Clamp(bevel, .00003f, Mathf.Min(half.x, half.y, half.z) * .49f);
            var inner = half - Vector3.one * bevel;
            var positions = new List<Vector3>();
            var normals = new List<Vector3>();
            var uv = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var normal in new[] { Vector3.right, Vector3.left, Vector3.up, Vector3.down, Vector3.forward, Vector3.back })
            {
                var u = Vector3.Cross(Mathf.Abs(normal.y) > .5f ? Vector3.forward : Vector3.up, normal).normalized;
                var v = Vector3.Cross(normal, u);
                var hU = Vector3.Dot(Abs(u), half);
                var hV = Vector3.Dot(Abs(v), half);
                var hN = Vector3.Dot(Abs(normal), half);
                var xs = new[] { -hU, -hU + bevel, hU - bevel, hU };
                var ys = new[] { -hV, -hV + bevel, hV - bevel, hV };
                var first = positions.Count;
                for (var j = 0; j < ys.Length; j++)
                    for (var i = 0; i < xs.Length; i++)
                    {
                        var outer = xs[i] * u + ys[j] * v + hN * normal;
                        var core = new Vector3(Mathf.Clamp(outer.x, -inner.x, inner.x),
                            Mathf.Clamp(outer.y, -inner.y, inner.y), Mathf.Clamp(outer.z, -inner.z, inner.z));
                        var n = (outer - core).normalized;
                        positions.Add(core + n * bevel);
                        normals.Add(n);
                        uv.Add(new Vector2((xs[i] + hU) / (hU * 2), (ys[j] + hV) / (hV * 2)));
                        if (i == 0 || j == 0) continue;
                        var d = first + j * 4 + i;
                        triangles.AddRange(new[] { d - 5, d - 4, d, d - 5, d, d - 1 });
                    }
            }
            return MeshAsset(key, positions, normals, uv, triangles);
        }

        static Mesh MakeLathe(string key, Vector2[] profile, int segments)
        {
            var positions = new List<Vector3>();
            var normals = new List<Vector3>();
            var uv = new List<Vector2>();
            var triangles = new List<int>();
            var normal = new Vector2[profile.Length - 1];
            for (var row = 0; row < normal.Length; row++)
            {
                var difference = profile[row + 1] - profile[row];
                normal[row] = new Vector2(difference.y, -difference.x).normalized;
            }
            for (var row = 0; row < normal.Length; row++)
            {
                var offset = positions.Count;
                for (var strip = 0; strip < 2; strip++)
                {
                    var point = profile[row + strip];
                    var n = normal[row];
                    var adjacent = row + (strip == 0 ? -1 : 1);
                    // 광학 곡면은 연속적인 법선으로, 가공 모서리는 선명하게 표현한다.
                    if (adjacent >= 0 && adjacent < normal.Length && Vector2.Dot(n, normal[adjacent]) > .92f)
                        n = (n + normal[adjacent]).normalized;
                    for (var i = 0; i <= segments; i++)
                    {
                        var a = i * Mathf.PI * 2 / segments;
                        var direction = new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a));
                        positions.Add(direction * point.x + Vector3.up * point.y);
                        normals.Add(direction * n.x + Vector3.up * n.y);
                        uv.Add(new Vector2(i / (float)segments, (row + strip) / (float)normal.Length));
                        if (strip != 1 || i >= segments) continue;
                        var s = offset + i;
                        var next = s + segments + 1;
                        triangles.AddRange(new[] { s, next, next + 1, s, next + 1, s + 1 });
                    }
                }
            }
            return MeshAsset(key, positions, normals, uv, triangles);
        }

        static Vector3 Abs(Vector3 v) => new(Mathf.Abs(v.x), Mathf.Abs(v.y), Mathf.Abs(v.z));

        static Mesh MeshAsset(string name, IEnumerable<Vector3> points, IEnumerable<Vector3> normals,
            IEnumerable<Vector2> uv, IEnumerable<int> indices)
        {
            var mesh = new Mesh { name = name };
            mesh.SetVertices(new List<Vector3>(points));
            mesh.SetNormals(new List<Vector3>(normals));
            if (uv != null) mesh.SetUVs(0, new List<Vector2>(uv));
            mesh.SetTriangles(new List<int>(indices), 0);
            mesh.RecalculateBounds();
            if (uv != null) mesh.RecalculateTangents();
            return Save(mesh, $"{Generated}/Models/{name}.asset");
        }
    }
}
