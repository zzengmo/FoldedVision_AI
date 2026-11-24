using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;
using static FoldedVision.Editor.FactoryGeometry;
using static FoldedVision.Editor.FactoryParts;

namespace FoldedVision.Editor
{
    public static class FactoryBuilder
    {
        public const string FactoryScene = Root + "/Scenes/FoldedVisionFactory.unity";
        const string ProbeFile = Generated + "/Textures/Factory reflections.exr";

        [MenuItem("Tools/FoldedVision/Build Factory")]
        public static void BuildFactory()
        {
            if (File.Exists(FactoryScene))
            {
                OpenFactory();
                Debug.Log("FoldedVision · 기존 공정 씬을 열었습니다.");
                return;
            }
            Build(false);
        }

        [MenuItem("Tools/FoldedVision/Open Factory")]
        public static void OpenFactory()
        {
            if (!File.Exists(FactoryScene)) { BuildFactory(); return; }
            if (SceneManager.GetActiveScene().path == FactoryScene) return;
            if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
                EditorSceneManager.OpenScene(FactoryScene, OpenSceneMode.Single);
        }

        [MenuItem("Tools/FoldedVision/Rebuild Generated Factory…")]
        static void ConfirmRebuild()
        {
            if (EditorUtility.DisplayDialog("FoldedVision", "생성된 공정 씬과 생성 에셋을 다시 구성합니다. 현재 공정 씬의 개별 편집은 저장본으로 되돌아갑니다.", "다시 생성", "취소"))
                Build(true);
        }

        internal static void Build(bool rebuild)
        {
            if (File.Exists(FactoryScene) && !rebuild) { OpenFactory(); return; }
            var loaded = SceneManager.GetSceneByPath(FactoryScene);
            var replaceSingleScene = false;
            if (loaded.IsValid() && loaded.isLoaded)
            {
                if (loaded.isDirty) throw new InvalidOperationException("공정 씬의 저장되지 않은 변경을 먼저 확인하세요.");
                if (SceneManager.sceneCount == 1) replaceSingleScene = true;
                else
                    EditorSceneManager.CloseScene(loaded, true);
            }

            foreach (var folder in new[] { "Materials", "Models", "Textures", "Prefabs" })
                Directory.CreateDirectory($"{Generated}/{folder}");
            Directory.CreateDirectory(Root + "/Scenes");
            AssetDatabase.Refresh();
            var prior = SceneManager.GetActiveScene();
            if (SceneManager.sceneCount == 1 && string.IsNullOrEmpty(prior.path))
            {
                if (prior.isDirty) throw new InvalidOperationException("열려 있는 이름 없는 씬을 먼저 저장하세요.");
                replaceSingleScene = true;
            }
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,
                replaceSingleScene ? NewSceneMode.Single : NewSceneMode.Additive);
            SceneManager.SetActiveScene(scene);

            var g = new FactoryGeometry();
            var palette = new FactoryPalette();
            var parts = new FactoryParts(g, palette).Build();
            var equipment = new FactoryEquipment(g, palette);
            var plant = Group(null, "FoldedVision AI Factory");
            plant.gameObject.AddComponent<FactorySignage>().signageShader = Shader.Find("FoldedVision/Depth-tested signage");
            BuildHall(plant, g, palette, equipment);
            var lines = Group(plant, "Three dedicated inspection lines");
            var lanes = new[]
            {
                equipment.Line(lines, PartKind.Lens, -4.44f, parts[0]),
                equipment.Line(lines, PartKind.Ring, 0, parts[1]),
                equipment.Line(lines, PartKind.PCB, 4.44f, parts[2])
            };
            Lobby(plant, g, palette);
            var probe = Lighting(plant);
            var camera = CreateCamera();
            var runtime = Group(null, "Cell sequencing and replay").gameObject.AddComponent<FactorySimulation>();
            runtime.lanes = lanes;
            runtime.factoryCamera = camera;
            runtime.recordings = AssetDatabase.LoadAssetAtPath<TextAsset>(Root + "/Resources/FoldedVision/replay.json");
            runtime.SetView(FactoryView.Overview);
            runtime.UpdateCamera(1);
            runtime.autoStart = false;
            new GameObject("FoldedVision operations dashboard", typeof(RectTransform), typeof(FactoryDashboard))
                .GetComponent<FactoryDashboard>().simulation = runtime;
            VerifyReferences(runtime);
            AssetDatabase.SaveAssets();
            if (!EditorSceneManager.SaveScene(scene, FactoryScene))
                throw new IOException("Could not save the generated factory scene.");
            if (prior.IsValid() && prior.isLoaded && !prior.isDirty)
                EditorSceneManager.CloseScene(prior, true);

            // 카메라와 금속 재질이 같은 설비 공간을 반사하도록 로컬 프로브를 저장한다.
            if (SystemInfo.graphicsDeviceType != GraphicsDeviceType.Null &&
                Lightmapping.BakeReflectionProbe(probe, ProbeFile))
            {
                AssetDatabase.ImportAsset(ProbeFile);
                probe.bakedTexture = AssetDatabase.LoadAssetAtPath<Cubemap>(ProbeFile);
                EditorSceneManager.MarkSceneDirty(scene);
                EditorSceneManager.SaveScene(scene);
            }

            var current = EditorBuildSettings.scenes.ToList();
            if (current.All(entry => entry.path != FactoryScene))
            {
                current.Add(new EditorBuildSettingsScene(FactoryScene, true));
                EditorBuildSettings.scenes = current.ToArray();
            }
            var sceneView = SceneView.lastActiveSceneView;
            if (sceneView != null)
                sceneView.LookAt(new Vector3(0, 1.1f, 0), camera.transform.rotation, 22, false);
            Debug.Log("FoldedVision factory scene saved: " + FactoryScene);
        }

        static void VerifyReferences(FactorySimulation runtime)
        {
            if (runtime.factoryCamera == null || runtime.lanes.Length != 3 || runtime.recordings == null)
                throw new InvalidOperationException("Factory camera, part lanes and replay manifest are required.");
            foreach (var lane in runtime.lanes)
            {
                if (lane.partPrefab == null || lane.belt == null || lane.scan == null)
                    throw new InvalidOperationException(lane.kind + " is missing the model or station references.");
                if (lane.kind == PartKind.Lens) continue;
                if (lane.bridge == null || lane.carriage == null || lane.head == null || lane.grip == null ||
                    lane.jawLeft == null || lane.jawRight == null || lane.pistons?.Length != 2 ||
                    lane.rollers?.Length != 13 || lane.screen == null || lane.indicator == null)
                    throw new InvalidOperationException(lane.kind + " sorting rig is incomplete.");
            }
        }

        static void BuildHall(Transform parent, FactoryGeometry g, FactoryPalette p, FactoryEquipment equipment)
        {
            var hall = Group(parent, "Cutaway hall / floor and shell");
            g.Box(hall, "Modular epoxy platform", new(0, -.22f, .25f), new(28.5f, .43f, 17.82f), p.Base, .09f);
            g.Box(hall, "Epoxy top coat", new(0, -.027f, .25f), new(28.35f, .045f, 17.67f), p.Floor, .008f);
            g.Box(hall, "Cutaway base front trim", new(0, -.157f, -8.69f), new(28.31f, .072f, .04f), p.Steel, .012f);
            g.Box(hall, "Hall foundation inset", new(0, -.46f, .26f), new(27.97f, .11f, 17.31f), p.Black, .034f);
            var rear = Group(hall, "Rear clean-wall structure");
            g.Box(rear, "Acoustic wall background", new(0, 2.23f, 8.95f), new(28.45f, 4.46f, .18f), p.DarkPanel, .022f);
            g.Box(rear, "Upper white acoustic band", new(0, 3.95f, 8.8f), new(28.42f, .72f, .16f), p.OffWhite, .02f);
            g.Box(rear, "Rear panel base rail", new(0, .28f, 8.81f), new(28.43f, .25f, .13f), p.Steel);
            for (var i = 0; i < 14; i++)
            {
                var x = -13.1f + i * 2.016f;
                g.Box(rear, "Powder-coated cleanroom panel", new(x, 1.96f, 8.81f), new(1.98f, 3.09f, .092f), p.Wall, .022f);
                g.Box(rear, "Service-panel horizontal break", new(x, 2.01f, 8.754f), new(1.85f, .019f, .025f), p.DarkPanel);
            }
            for (var i = 0; i < 5; i++)
            {
                var x = -12.5f + i * 6.25f;
                g.Box(rear, "HSS structural pillar", new(x, 2.48f, 8.56f), new(.26f, 4.88f, .29f), p.OffWhite, .04f);
                g.Box(rear, "Pillar bolted foot", new(x, .115f, 8.54f), new(.54f, .16f, .64f), p.Black, .021f);
                g.Box(rear, "Bay marker trim", new(x, 3.65f, 8.38f), new(.31f, .032f, .055f), p.Teal);
                g.Box(rear, "Cable tray drop", new(x + 1.52f, 2f, 8.61f), new(.155f, 3.22f, .14f), p.Black);
                g.Box(rear, "Wall utility station", new(x + 1.52f, 1.18f, 8.42f), new(.302f, .40f, .22f), p.Steel, .03f);
            }
            g.Box(rear, "Rear ceiling truss lower chord", new(0, 4.62f, 8.27f), new(28.1f, .093f, .21f), p.Steel);
            g.Box(rear, "Rear ceiling truss upper chord", new(0, 5.10f, 8.27f), new(28.1f, .09f, .21f), p.Steel);
            for (var i = 0; i < 31; i++)
                g.Box(rear, "Welded truss diagonal", new(-13.2f + i * .88f, 4.86f, 8.26f), new(.88f, .050f, .073f),
                    p.Steel, .009f, new(0, 0, i % 2 == 0 ? 30 : -30));
            g.Box(rear, "Ceiling service tray", new(0, 4.42f, 8.22f), new(27.8f, .073f, .41f), p.Black, .01f);
            for (var x = -12f; x < 13f; x += 4f)
            {
                g.Box(rear, "Suspended LED housing", new(x, 4.45f, 7.66f), new(2.34f, .10f, .21f), p.Black, .015f);
                g.Box(rear, "LED prismatic diffuser", new(x, 4.379f, 7.65f), new(2.18f, .052f, .146f), p.Overhead, .008f);
                g.Box(rear, "Square ventilation duct", new(x, 3.93f, 8.54f), new(2.83f, .27f, .24f), p.Steel, .04f);
            }
            for (var i = 0; i < 3; i++)
            {
                var x = i * 9 - 9f;
                g.Cylinder(rear, "Ventilation grille bezel", new(x, 3.95f, 8.40f), .153f, .063f, p.DarkPanel, new(90, 0, 0), 36);
                for (var j = 0; j < 6; j++)
                    g.Box(rear, "Ventilator louver", new(x, 3.86f + .034f * j, 8.36f), new(.26f, .016f, .012f), p.Steel, .002f);
            }
            g.Tube(rear, "Compressed air main", .043f, p.Teal, new(-13.65f, 1.36f, 8.54f), new(-13.65f, 3.21f, 8.53f),
                new(-13.45f, 3.35f, 8.5f), new(13.22f, 3.35f, 8.5f), new(13.43f, 3.19f, 8.5f), new(13.43f, 1.25f, 8.5f));
            g.Tube(rear, "Electrical conduit", .031f, p.Steel, new(-13.49f, 1.33f, 8.52f), new(-13.49f, 3.04f, 8.51f),
                new(-13.32f, 3.17f, 8.48f), new(13.10f, 3.17f, 8.48f), new(13.25f, 3.03f, 8.49f), new(13.25f, 1.25f, 8.49f));
            Mark(rear, "FOLDEDVISION   /   PRECISION INSPECTION", new(1.8f, 3.79f, 8.43f), .37f, TextAnchor.MiddleCenter, Vector3.zero);
            g.Combine(rear, "Industrial hall rear");

            var pavement = Group(parent, "Safety lanes and walkway");
            g.Box(pavement, "Main pedestrian walkway", new(0, .002f, -7.76f), new(28.05f, .007f, 1.36f), p.DarkPanel, .001f);
            foreach (var z in new[] { -8.42f, -7.10f, -2.25f, 2.25f, 6.82f })
                g.Box(pavement, "Painted yellow boundary", new(0, .007f, z), new(27.55f, .009f, .056f), p.Safety, .001f);
            foreach (var x in new[] { -11.86f, 2.05f, 11.95f })
                for (var i = 0; i < 23; i++)
                    g.Box(pavement, "Hazard hatch", new(x, .015f, -6.75f + i * .595f), new(.28f, .010f, .059f), p.Safety, .001f, new(0, 34, 0));
            for (var i = 0; i < 8; i++)
                g.Box(pavement, "Loading zone crossing band", new(-12.17f + i * .235f, .015f, -7.67f),
                    new(.124f, .010f, .92f), p.OffWhite, .001f);
            for (var i = 0; i < 7; i++)
            {
                var x = -7.9f + i * 3.08f;
                foreach (var direction in new[] { -1, 1 })
                    g.Box(pavement, "Painted walkway chevron", new(x, .012f, -7.77f + direction * .124f),
                        new(.34f, .011f, .048f), p.OffWhite, .001f, new(0, direction * 47, 0));
            }
            Mark(pavement, "COMPONENT INFEED", new(-9.6f, .025f, -6.91f), .24f, TextAnchor.MiddleCenter);
            Mark(pavement, "INSPECTED BUFFER", new(9.1f, .025f, -6.91f), .24f, TextAnchor.MiddleCenter);
            g.Combine(pavement, "Factory floor markings");
            var fences = Group(parent, "Modular mesh safety screens");
            for (var i = 0; i < 6; i++)
            {
                Fence(fences, g, p, new Vector3(3.62f + i * 1.34f, 0, 6.75f));
                if (i < 4) Fence(fences, g, p, new Vector3(-11.1f + i * 1.34f, 0, 6.75f));
            }
            g.Combine(fences, "Safety mesh fence");

            var cabinets = Group(parent, "Service and logistics area");
            for (var i = 0; i < 3; i++)
            {
                var z = -4.44f + i * 4.44f;
                g.Box(cabinets, "Input material rack crossbeam", new(-12.72f, .83f, z), new(.73f, .10f, 2.08f), p.DarkPanel);
                foreach (var s in new[] { -1, 1 })
                {
                    g.Box(cabinets, "Storage rack post", new(-12.99f, .64f, z + s * .96f), new(.08f, 1.25f, .086f), p.Steel);
                    g.Box(cabinets, "Storage rack post", new(-12.40f, .64f, z + s * .96f), new(.08f, 1.25f, .086f), p.Steel);
                }
                for (var row = 0; row < 2; row++)
                    for (var j = 0; j < 3; j++)
                    {
                        var y = .41f + row * .45f;
                        g.Box(cabinets, "Reusable anti-static tote", new(-12.69f, y, z + j * .605f - .6f), new(.63f, .17f, .557f), p.DarkPanel, .022f);
                        g.Box(cabinets, "Tote stacking shoulder", new(-12.69f, y + .087f, z + j * .605f - .6f), new(.65f, .039f, .573f), p.Teal, .01f);
                    }
                var station = Group(cabinets, "PLC cabinet", new(11.65f, 0, z + .48f));
                g.Box(station, "Electrical cabinet shell", new(0, .77f, 0), new(.66f, 1.5f, .54f), p.OffWhite, .034f);
                g.Box(station, "Cabinet door", new(0, .78f, -.283f), new(.60f, 1.35f, .037f), p.Panel);
                g.Box(station, "Cabinet handle", new(.21f, .82f, -.324f), new(.045f, .23f, .044f), p.Black, .011f);
                for (var j = 0; j < 8; j++)
                    g.Box(station, "Cabinet stamped air slot", new(-.06f, .24f + j * .031f, -.309f), new(.25f, .011f, .016f), p.Black);
                equipment.EmergencyStop(station, new(-.12f, 1.24f, -.35f));
            }
            g.Combine(cabinets, "Totes and cabinets");
        }

        static void Fence(Transform parent, FactoryGeometry g, FactoryPalette p, Vector3 at)
        {
            g.Box(parent, "Fence anchored post", at + new Vector3(-.65f, .68f, 0), new(.078f, 1.36f, .093f), p.DarkPanel);
            g.Box(parent, "Fence safety post cap", at + new Vector3(-.65f, 1.38f, 0), new(.09f, .11f, .10f), p.Safety);
            foreach (var height in new[] { .29f, 1.22f })
                g.Box(parent, "Welded mesh frame", at + new Vector3(0, height, 0), new(1.25f, .049f, .055f), p.Steel);
            for (var i = 0; i < 12; i++)
                g.Box(parent, "Wire screen vertical wire", at + new Vector3(-.57f + i * .103f, .76f, .004f),
                    new(.009f, .93f, .009f), p.Guard, .001f);
            for (var i = 0; i < 8; i++)
                g.Box(parent, "Wire screen horizontal wire", at + new Vector3(0, .34f + i * .112f, 0),
                    new(1.19f, .009f, .009f), p.Guard, .001f);
        }

        static void Lobby(Transform parent, FactoryGeometry g, FactoryPalette p)
        {
            var control = Group(parent, "Factory monitor desk", new(7.75f, 0, 7.8f));
            g.Box(control, "Control desk aluminum base", new(0, .56f, 0), new(3.95f, 1.06f, .78f), p.OffWhite, .037f);
            g.Box(control, "Graphite worktop", new(0, 1.11f, -.05f), new(4.09f, .105f, 1.02f), p.Black, .036f);
            g.Box(control, "Console facing", new(0, .62f, -.406f), new(3.85f, .38f, .073f), p.DarkPanel, .021f);
            g.Box(control, "Console accent strip", new(0, .86f, -.46f), new(3.86f, .025f, .024f), p.TealLamp);
            Mark(control, "CELL CONTROL", new(0, .634f, -.459f), .125f, TextAnchor.MiddleCenter, Vector3.zero);
            for (var i = -1; i <= 1; i++)
            {
                var x = i * 1.51f;
                g.Box(control, "Control monitor housing", new(x, 1.59f, 0), new(1.34f, .84f, .124f), p.Black, .039f);
                g.Box(control, "Control monitor display", new(x, 1.6f, -.075f), new(1.26f, .75f, .025f), p.Screen, .02f);
                g.Box(control, "Display mount", new(x, 1.25f, .11f), new(.20f, .26f, .18f), p.Steel);
                Mark(control, i == -1 ? "L-01  OPTICS\nMODEL PENDING" : i == 0 ? "R-02  RING\nREVIEW ROUTE" : "P-03  PCB\nSORTING",
                    new(x, 1.59f, -.094f), .091f, TextAnchor.MiddleCenter, Vector3.zero);
                g.Box(control, "Operator keypad", new(x, 1.173f, -.392f), new(.49f, .026f, .146f), p.DarkPanel, .012f);
            }
        }

        static ReflectionProbe Lighting(Transform parent)
        {
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(.53f, .63f, .72f);
            RenderSettings.ambientEquatorColor = new Color(.26f, .32f, .36f);
            RenderSettings.ambientGroundColor = new Color(.105f, .145f, .17f);
            RenderSettings.ambientIntensity = 1.12f;
            RenderSettings.reflectionIntensity = .82f;
            var skyShader = Shader.Find("Skybox/Procedural");
            if (skyShader != null)
            {
                var sky = new Material(skyShader) { name = "Factory daylight reflections" };
                sky.SetFloat("_SunSize", .08f);
                sky.SetFloat("_AtmosphereThickness", .77f);
                sky.SetColor("_SkyTint", new Color(.60f, .67f, .72f));
                sky.SetColor("_GroundColor", new Color(.31f, .34f, .38f));
                sky.SetFloat("_Exposure", .91f);
                RenderSettings.skybox = Save(sky, $"{Generated}/Materials/Factory daylight reflections.mat");
            }
            var lightRoot = Group(parent, "Lighting and color");
            var key = Group(lightRoot, "Large neutral key light").gameObject.AddComponent<Light>();
            key.type = LightType.Directional;
            key.transform.localRotation = Quaternion.Euler(46, -31, 0);
            key.color = new Color(1, .95f, .88f);
            key.intensity = 1.55f;
            key.shadows = LightShadows.Soft;
            key.shadowStrength = .84f;
            key.shadowBias = .075f;
            RenderSettings.sun = key;
            var fill = Group(lightRoot, "Cool ceiling bounce").gameObject.AddComponent<Light>();
            fill.type = LightType.Directional;
            fill.transform.localRotation = Quaternion.Euler(54, 138, 0);
            fill.color = new Color(.63f, .83f, 1);
            fill.intensity = .38f;
            fill.shadows = LightShadows.None;
            for (var i = 0; i < 3; i++)
            {
                var led = Group(lightRoot, "Ceiling LED fixture", new(i * 7.7f - 7.7f, 4.98f, 3.5f)).gameObject.AddComponent<Light>();
                led.type = LightType.Point;
                led.color = new Color(.79f, .89f, 1);
                led.intensity = 2.7f;
                led.range = 9f;
            }
            var probe = Group(lightRoot, "Precision cell reflection capture", new(-.8f, 2.3f, .5f)).gameObject.AddComponent<ReflectionProbe>();
            probe.size = new Vector3(28, 7, 16);
            probe.resolution = 128;
            probe.mode = ReflectionProbeMode.Baked;
            probe.boxProjection = true;
            probe.clearFlags = ReflectionProbeClearFlags.Skybox;
            probe.intensity = .95f;

            var profile = ScriptableObject.CreateInstance<VolumeProfile>();
            var path = Generated + "/PresentationVolume.asset";
            var persistent = AssetDatabase.LoadAssetAtPath<VolumeProfile>(path);
            if (persistent == null)
            {
                var tonemapping = profile.Add<Tonemapping>(true);
                tonemapping.mode.Override(TonemappingMode.ACES);
                var bloom = profile.Add<Bloom>(true);
                bloom.threshold.Override(1.31f);
                bloom.intensity.Override(.31f);
                bloom.scatter.Override(.49f);
                var color = profile.Add<ColorAdjustments>();
                color.contrast.Override(9);
                color.saturation.Override(-5);
                var vignette = profile.Add<Vignette>();
                vignette.intensity.Override(.22f);
                vignette.smoothness.Override(.65f);
                AssetDatabase.CreateAsset(profile, path);
                foreach (var entry in profile.components) AssetDatabase.AddObjectToAsset(entry, profile);
            }
            else
            {
                UnityEngine.Object.DestroyImmediate(profile);
                profile = persistent;
            }
            var volume = Group(lightRoot, "ACES, bloom and vignette").gameObject.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.sharedProfile = profile;
            return probe;
        }

        static Camera CreateCamera()
        {
            var view = Group(null, "Factory presentation camera").gameObject;
            view.tag = "MainCamera";
            var camera = view.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(.045f, .075f, .11f);
            camera.nearClipPlane = .065f;
            camera.farClipPlane = 110;
            camera.allowHDR = true;
            var data = camera.GetUniversalAdditionalCameraData();
            data.renderPostProcessing = true;
            data.antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            data.antialiasingQuality = AntialiasingQuality.High;
            return camera;
        }
    }
}
