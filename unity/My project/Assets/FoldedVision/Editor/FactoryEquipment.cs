using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using static FoldedVision.Editor.FactoryGeometry;
using static FoldedVision.Editor.FactoryParts;
using static FoldedVision.FactorySimulation;

namespace FoldedVision.Editor
{
    internal class FactoryEquipment
    {
        readonly FactoryGeometry g;
        readonly FactoryPalette p;
        static readonly Vector3 Across = new(90, 0, 0), Side = new(0, 0, 90);

        internal FactoryEquipment(FactoryGeometry geometry, FactoryPalette palette)
        {
            g = geometry;
            p = palette;
        }

        internal InspectionLane Line(Transform plant, PartKind kind, float positionZ, GameObject prefab)
        {
            var line = new InspectionLane
            {
                kind = kind, root = Group(plant, kind + " / inspection line", new Vector3(0, 0, positionZ)),
                partPrefab = prefab, jawGap = kind == PartKind.PCB ? .145f : .19f
            };
            Conveyor(line);
            Station(line);
            if (kind == PartKind.Lens)
            {
                var lens = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                lens.transform.SetParent(line.root, false);
                lens.transform.localPosition = new Vector3(ScanX, BeltTop, 0);
                DisplayWaitingTray(line);
                Mark(line.root, "LENS   /   OPTICAL DISPLAY", new(-6.95f, .025f, -1.72f), .22f, TextAnchor.MiddleCenter);
            }
            else
            {
                Gantry(line);
                Mark(line.root, kind == PartKind.Ring ? "R-02   /   TURNED PARTS" : "P-03   /   ELECTRONICS",
                    new(-6.95f, .025f, -1.72f), .23f, TextAnchor.MiddleCenter);
            }
            return line;
        }

        void Conveyor(InspectionLane line)
        {
            var assembly = Group(line.root, "Infeed conveyor / adjustable frame");
            var fixedParts = Group(assembly, "Frame, mounts and guards");
            var rollers = new List<Transform>();
            g.Box(fixedParts, "Slider bed", new(-3.1f, .97f, 0), new(13.95f, .18f, 1.28f), p.Black);
            foreach (var sign in new[] { -1, 1 })
            {
                var z = sign * .68f;
                g.Box(fixedParts, "Longitudinal extrusion", new(-3.12f, .98f, z), new(14.12f, .23f, .105f), p.Steel, .017f);
                g.Box(fixedParts, "Extrusion slot", new(-3.12f, .994f, z + sign * .054f), new(13.7f, .02f, .009f), p.Black, .004f);
                g.Box(fixedParts, "Raised part guide", new(-3.10f, 1.178f, sign * .594f), new(13.6f, .043f, .039f), p.Brushed);
                for (var i = 0; i < 7; i++)
                {
                    var x = -9.5f + i * 2.05f;
                    g.Box(fixedParts, "Conveyor leg", new(x, .51f, z), new(.104f, .85f, .103f), p.Steel);
                    g.Box(fixedParts, "Diagonal bracket", new(x + .14f, .82f, z), new(.045f, .4f, .046f), p.Steel, .012f, new(0, 0, -42));
                    g.Box(fixedParts, "Guide bracket", new(x, 1.1f, z), new(.10f, .12f, .089f), p.Black);
                    g.Cylinder(fixedParts, "Levelling foot", new(x, .046f, z), .085f, .052f, p.Rubber);
                    g.Cylinder(fixedParts, "Levelling stud", new(x, .108f, z), .028f, .095f, p.Chrome);
                }
            }
            for (var i = 0; i < 7; i++)
                g.Box(fixedParts, "Leg cross brace", new(-9.5f + i * 2.05f, .34f, 0), new(.083f, .09f, 1.41f), p.Steel);
            var belt = g.Surface(assembly, "Animated carrying belt", new(-3.1f, BeltTop, 0), 14.12f, 1.22f, p.Belt, .32f);
            line.belt = belt.GetComponent<Renderer>();
            for (var i = 0; i < 13; i++)
            {
                var x = -10.03f + i * 13.86f / 12f;
                var pivot = Group(assembly, i == 0 ? "Tail drum" : i == 12 ? "Motor drive drum" : "Return idler", new(x, i is 0 or 12 ? 1.016f : .83f, 0));
                g.Cylinder(pivot, "Rubber roller sleeve", default, i is 0 or 12 ? .122f : .056f, 1.24f, p.Rubber, Across);
                g.Cylinder(pivot, "Through shaft", default, .031f, 1.53f, p.Chrome, Across);
                for (var j = 0; j < 8; j++)
                    g.Box(pivot, "Roller index ribs", Quaternion.Euler(0, 0, j * 45) *
                        new Vector3(i is 0 or 12 ? .120f : .056f, 0, -.61f),
                        new(.004f, .009f, .084f), p.Steel, .001f);
                rollers.Add(pivot);
            }
            line.rollers = rollers.ToArray();
            g.Box(fixedParts, "Drive reduction enclosure", new(3.6f, 1.00f, -.82f), new(.43f, .32f, .35f), p.DarkPanel, .04f);
            g.Cylinder(fixedParts, "Motor and aluminum end bell", new(3.6f, 1.00f, -1.11f), .164f, .38f, p.Steel, Across);
            for (var i = 0; i < 10; i++)
                g.Box(fixedParts, "Motor cooling fin", new(3.6f + Mathf.Cos(i * .6283f) * .153f, 1.0f + Mathf.Sin(i * .6283f) * .153f, -1.13f),
                    new(.027f, .06f, .37f), p.Black, .005f, new(0, 0, i * 36));
            g.Box(fixedParts, "Safety guard", new(3.62f, 1.21f, -.74f), new(.62f, .06f, .35f), p.Safety, .027f);
            g.Tube(fixedParts, "Conveyor motor cable", .022f, p.Rubber, new(3.61f, .87f, -1.12f), new(3.52f, .68f, -.99f), new(3.18f, .60f, -.77f),
                new(.9f, .60f, -.77f), new(.8f, .35f, -.77f));
            FeedTray(fixedParts);
            g.Combine(fixedParts, "Conveyor frame");
            if (line.kind == PartKind.Lens) SavePrefab(assembly, "InfeedConveyor");
        }

        void FeedTray(Transform parent)
        {
            g.Box(parent, "Infeed guide hopper", new(-10.19f, 1.091f, 0), new(.55f, .077f, 1.19f), p.Black);
            for (var a = -1; a <= 1; a += 2)
            {
                g.Box(parent, "Feeder edge guide", new(-10.00f, 1.16f, a * .47f), new(.64f, .075f, .165f), p.Panel, .012f, new(0, a * 7f, 0));
                g.Box(parent, "Pneumatic feeder carriage", new(-9.69f, .88f, a * .82f), new(.50f, .27f, .25f), p.DarkPanel);
                g.Tube(parent, "Feeder pneumatic line", .016f, p.Teal, new(-9.78f, .86f, a * .93f), new(-9.63f, .66f, a * .86f), new(-9.36f, .63f, a * .68f));
            }
        }

        void Station(InspectionLane line)
        {
            var station = Group(line.root, "Machine vision cell", new(ScanX, 0, 0));
            var skeleton = Group(station, "Fixed enclosure");
            g.Box(skeleton, "CNC base plinth", new(0, .18f, 0), new(2.85f, .33f, 2.00f), p.DarkPanel, .045f);
            g.Box(skeleton, "Lower pull-out electronics", new(.02f, .59f, -.3f), new(2.38f, .64f, 1.31f), p.OffWhite, .045f);
            for (var i = -1; i <= 1; i++)
            {
                g.Box(skeleton, "Access door and gasket", new(i * .765f, .59f, -.968f), new(.72f, .55f, .024f), p.Panel, .016f);
                g.Box(skeleton, "Recessed access handle", new(i * .765f + .26f, .62f, -.987f), new(.024f, .15f, .019f), p.Black, .004f);
            }
            foreach (var x in new[] { -1.27f, 1.27f })
                foreach (var z in new[] { -.9f, .9f })
                {
                    g.Box(skeleton, "Anodized upright extrusion", new(x, 1.88f, z), new(.107f, 1.67f, .105f), p.Steel, .012f);
                    g.Box(skeleton, "Extrusion shadow gap", new(x, 1.88f, z - .054f), new(.023f, 1.58f, .005f), p.Black, .002f);
                    for (var j = 0; j < 3; j++)
                        g.Cylinder(skeleton, "M6 enclosure fastener", new(x, 1.23f + j * .67f, z - .056f), .021f, .011f, p.Chrome, Across, 12);
                }
            g.Box(skeleton, "Upper optical enclosure", new(0, 2.72f, 0), new(2.78f, .36f, 1.97f), p.OffWhite, .055f);
            g.Box(skeleton, "Dark front fascia", new(0, 2.70f, -.993f), new(2.60f, .255f, .069f), p.DarkPanel, .03f);
            g.Box(skeleton, "Teal indicator rail", new(0, 2.555f, -1.01f), new(2.61f, .027f, .035f), p.TealLamp, .006f);
            g.Box(skeleton, "Rear enclosure panel", new(0, 1.89f, .915f), new(2.49f, 1.33f, .10f), p.Panel, .025f);
            g.Box(skeleton, "Rear acoustic shield", new(0, 1.98f, .85f), new(1.85f, .78f, .06f), p.DarkPanel);
            for (var i = 0; i < 7; i++)
                g.Box(skeleton, "Filtered ventilation slot", new(1.02f, .48f + i * .042f, -.986f), new(.13f, .012f, .018f), p.Black, .001f);
            foreach (var side in new[] { -1, 1 })
            {
                g.Box(skeleton, "Polycarbonate side guard", new(side * 1.28f, 2.02f, .02f), new(.028f, .835f, 1.70f), p.GlassGuard, .008f);
                g.Box(skeleton, "Front polycarbonate strip", new(side * .938f, 2.0f, -.91f), new(.51f, .91f, .022f), p.GlassGuard, .006f);
                g.Box(skeleton, "Side blue inspection light", new(side * .83f, 1.60f, .46f), new(.12f, .068f, .55f), p.TealLamp, .01f, new(0, 0, side * 20));
            }
            g.Box(skeleton, "Camera X mounting plate", new(0, 2.48f, .06f), new(1.42f, .075f, .31f), p.Black);
            g.Box(skeleton, "Camera mounting slide", new(0, 2.39f, .03f), new(.39f, .12f, .35f), p.Steel, .022f);
            g.Box(skeleton, "GigE vision head", new(0, 2.20f, 0), new(.37f, .29f, .32f), p.Black, .033f);
            g.Box(skeleton, "Finned imager back plate", new(0, 2.22f, .175f), new(.355f, .268f, .046f), p.DarkPanel, .018f);
            for (var i = 0; i < 7; i++)
                g.Box(skeleton, "Camera cooling fin", new(-.135f + .045f * i, 2.22f, .208f), new(.017f, .218f, .027f), p.Steel, .006f);
            g.Turn(skeleton, "C mount lens body", "Industrial camera lens", new(0, 2.055f, 0), p.Black, 54, default,
                new(.102f, -.22f), new(.146f, -.22f), new(.149f, -.192f), new(.143f, -.135f), new(.153f, -.121f),
                new(.156f, -.071f), new(.138f, -.057f), new(.111f, 0), new(.092f, 0), new(.094f, -.208f), new(.102f, -.22f));
            g.Cylinder(skeleton, "Machine vision front element", new(0, 1.859f, 0), .104f, .023f, p.OpticDeep, segments: 48);
            g.Cylinder(skeleton, "Lens retaining bezel", new(0, 1.988f, 0), .152f, .046f, p.Steel, segments: 64);
            g.Turn(skeleton, "LED heat sink ring", "Vision ring housing", new(0, 1.735f, 0), p.Black, 60, default,
                new(.244f, -.022f), new(.336f, -.022f), new(.353f, .005f), new(.342f, .041f),
                new(.267f, .041f), new(.24f, .025f), new(.244f, -.022f));
            line.scanRing = g.Turn(station, "Controllable coaxial LED", "Vision LED annulus", new(0, 1.71f, 0), p.TealLamp, 72, default,
                new(.253f, -.005f), new(.329f, -.005f), new(.33f, .004f), new(.247f, .004f), new(.253f, -.005f)).GetComponent<Renderer>();
            for (var i = 0; i < 22; i++)
                g.Cylinder(skeleton, "Individual LED window", Radial(.294f, 1.705f, i * 360f / 22f), .010f, .007f, p.TealLamp, segments: 12);
            var light = Group(station, "Inspection spotlight", new(0, 1.706f, 0));
            light.localRotation = Quaternion.Euler(90, 0, 0);
            line.scan = light.gameObject.AddComponent<Light>();
            line.scan.type = LightType.Spot;
            line.scan.color = new Color(.47f, .86f, 1);
            line.scan.intensity = .8f;
            line.scan.range = 1.4f;
            line.scan.spotAngle = 79;
            line.scan.innerSpotAngle = 50;
            line.scan.shadows = LightShadows.None;
            var warm = Group(station, "Soft fill across front lens", new(.16f, 2.14f, -.83f)).gameObject.AddComponent<Light>();
            warm.type = LightType.Point;
            warm.color = new Color(.72f, .83f, 1);
            warm.range = 2.35f;
            warm.intensity = .76f;
            g.Tube(skeleton, "Camera GigE harness", .026f, p.Rubber, new(.09f, 2.28f, .192f), new(.11f, 2.33f, .40f),
                new(.21f, 2.45f, .59f), new(.61f, 2.46f, .73f), new(1.09f, 2.31f, .74f), new(1.11f, .39f, .75f));
            g.Tube(skeleton, "Inspection lighting harness", .014f, p.Teal, new(.31f, 1.754f, .035f), new(.50f, 1.82f, .17f),
                new(.73f, 1.94f, .42f), new(1.15f, 1.96f, .70f));

            foreach (var sign in new[] { -1, 1 })
            {
                g.Box(skeleton, "Part presence photoeye", new(-.55f, 1.227f, sign * .65f), new(.16f, .10f, .104f), p.Black, .016f);
                g.Box(skeleton, "Photoeye aperture", new(-.55f, 1.229f, sign * .593f), new(.047f, .037f, .009f), p.TealLamp, .006f);
            }
            line.stop = Group(line.root, "Retractable positioning tab", new(ScanX + .28f, BeltTop - .15f, 0));
            g.Box(line.stop, "Fixture stop", new(0, -.05f, 0), new(.052f, .055f, .58f), p.Brushed);
            const float hmiX = 1.52f;
            g.Box(skeleton, "HMI mounting arm", new(1.36f, 1.74f, -.94f), new(.36f, .075f, .092f), p.Black);
            g.Box(skeleton, "HMI enclosure", new(hmiX, 1.87f, -1.02f), new(.49f, .34f, .10f), p.Black, .039f);
            line.screen = g.Box(station, "Live indicator panel", new(hmiX, 1.89f, -1.077f), new(.425f, .245f, .02f), p.Screen, .011f).GetComponent<Renderer>();
            Mark(station, "VISION  /  " + (line.kind == PartKind.Lens ? "OFFLINE" : "CELL"), new(hmiX, 1.89f, -1.095f), .043f,
                TextAnchor.MiddleCenter, Vector3.zero);
            for (var i = 0; i < 3; i++)
                g.Box(skeleton, "HMI physical key", new(hmiX - .071f + .071f * i, 1.725f, -1.080f), new(.042f, .021f, .014f), p.Panel, .004f);
            g.Cylinder(skeleton, "Stacklight pedestal", new(1.10f, 2.946f, -.60f), .052f, .19f, p.Steel);
            line.indicator = g.Cylinder(station, "RGB inspection stacklight", new(1.10f, 3.049f, -.60f), .064f, .112f,
                line.kind == PartKind.Lens ? p.Panel : p.Signal, segments: 32).GetComponent<Renderer>();
            g.Cylinder(skeleton, "Stacklight top cap", new(1.10f, 3.117f, -.60f), .068f, .033f, p.Black);
            EmergencyStop(skeleton, new(-1.00f, 1.041f, -1.03f));
            Mark(station, line.kind == PartKind.Lens ? "L-01     /     OPTICAL" : line.kind == PartKind.Ring ? "R-02     /     SURFACE" : "P-03     /     CIRCUIT",
                new(0, 2.706f, -1.04f), .124f, TextAnchor.MiddleCenter, Vector3.zero);
            g.Combine(skeleton, "Vision cell frame");
            if (line.kind == PartKind.Ring) SavePrefab(station, "VisionInspectionStation");
        }

        void Gantry(InspectionLane lane)
        {
            var baseFrame = Group(lane.root, "XYZ sorting gantry");
            var frame = Group(baseFrame, "Guarded steel structure");
            foreach (var z in new[] { -1.98f, 1.98f })
            {
                g.Box(frame, "Gantry upper box rail", new(6.56f, 3.08f, z), new(7.24f, .165f, .177f), p.DarkPanel, .029f);
                g.Box(frame, "Ground linear spline", new(6.57f, 3.18f, z), new(7.13f, .035f, .065f), p.Chrome);
                for (var i = 0; i < 17; i++)
                    g.Cylinder(frame, "Rail countersunk fastener", new(3.2f + i * .42f, 3.203f, z), .016f, .008f, p.Black);
                foreach (var x in new[] { 3.0f, 10.16f })
                {
                    g.Box(frame, "Gantry square upright", new(x, 1.55f, z), new(.19f, 2.97f, .19f), p.OffWhite, .025f);
                    g.Box(frame, "Gusset", new(x + (x > 5 ? -.17f : .17f), 2.81f, z), new(.075f, .51f, .125f),
                        p.Steel, .018f, new(0, 0, x > 5 ? -36 : 36));
                    g.Box(frame, "Stamped anchor plate", new(x, .055f, z), new(.41f, .09f, .38f), p.DarkPanel, .019f);
                    for (var a = -1; a <= 1; a += 2)
                        for (var b = -1; b <= 1; b += 2)
                            g.Cylinder(frame, "M12 floor anchor", new(x + .14f * a, .115f, z + .13f * b), .031f, .026f, p.Brushed, segments: 12);
                }
            }
            foreach (var x in new[] { 3f, 10.16f })
                g.Box(frame, "Gantry end transom", new(x, 3.03f, 0), new(.16f, .16f, 3.94f), p.Steel, .025f);
            g.Box(frame, "Cable chain channel", new(6.55f, 3.14f, 2.18f), new(7.02f, .14f, .17f), p.Black);
            for (var i = 0; i < 34; i++)
                g.Box(frame, "Cable carrier articulated link", new(3.30f + .194f * i, 3.231f, 2.18f), new(.142f, .027f, .162f), p.Steel, .006f);
            g.Box(frame, "Travel servo cover", new(10.12f, 3.11f, 2.04f), new(.48f, .31f, .37f), p.DarkPanel, .04f);
            g.Tube(frame, "Gantry power conduit", .031f, p.Rubber, new(10.2f, 3.1f, 2.22f), new(10.38f, 2.91f, 2.19f),
                new(10.42f, .30f, 2.17f), new(10.13f, .12f, 1.89f));
            g.Combine(frame, "Gantry grounded structure");

            lane.bridge = Group(baseFrame, "X axis carriage", new(PickX, 0, 0));
            g.Box(lane.bridge, "Dual extrusion bridge", new(0, 3.26f, 0), new(.37f, .205f, 4.15f), p.Teal, .025f);
            g.Box(lane.bridge, "Lead track cover", new(-.17f, 3.28f, 0), new(.046f, .102f, 3.91f), p.Steel, .012f);
            foreach (var z in new[] { -1.98f, 1.98f })
            {
                g.Box(lane.bridge, "X axis slide bearing", new(0, 3.179f, z), new(.55f, .14f, .248f), p.Black);
                g.Box(lane.bridge, "Retainer plate", new(0, 3.370f, z), new(.36f, .046f, .27f), p.Steel);
            }
            lane.carriage = Group(lane.bridge, "Y transverse carriage");
            g.Box(lane.carriage, "Servo-driven transverse saddle", new(0, 3.266f, 0), new(.52f, .33f, .44f), p.Black, .034f);
            g.Cylinder(lane.carriage, "Drive motor gearbox", new(.07f, 3.39f, .02f), .128f, .26f, p.Steel);
            g.Box(lane.carriage, "Motor terminal cap", new(.07f, 3.518f, .04f), new(.175f, .049f, .166f), p.DarkPanel);
            g.Box(lane.carriage, "Nitrided Z guide sleeve", new(0, 2.99f, 0), new(.28f, .26f, .251f), p.DarkPanel, .027f);
            lane.head = Group(lane.carriage, "Z lift and dual jaw gripper", new(0, 2.62f, 0));
            lane.pistons = new Transform[2];
            for (var i = 0; i < 2; i++)
                lane.pistons[i] = g.Cylinder(lane.head, "Hardened sliding piston", new((i - .5f) * .162f, .29f, 0), .033f, 1f, p.Chrome);
            g.Box(lane.head, "Servo gripper body", new(0, .04f, 0), new(.284f, .14f, .292f), p.Steel, .024f);
            g.Box(lane.head, "Gripper teal cover", new(0, .079f, 0), new(.27f, .057f, .279f), p.Teal, .016f);
            lane.grip = Group(lane.head, "Attachment datum");
            lane.jawLeft = Jaw(lane.head, -1, lane.jawGap);
            lane.jawRight = Jaw(lane.head, 1, lane.jawGap);
            Bins(lane.root);
            if (lane.kind == PartKind.Ring) SavePrefab(baseFrame, "CartesianSortingGantry");
        }

        Transform Jaw(Transform head, int sign, float gap)
        {
            var jaw = Group(head, sign < 0 ? "Left parallel jaw" : "Right parallel jaw", new(0, -.105f, sign * (gap + .075f)));
            g.Box(jaw, "Finger machined body", new(0, .056f, sign * .022f), new(.065f, .135f, .043f), p.Brushed, .008f);
            g.Box(jaw, "Elastomer grip pad", new(0, .013f, 0), new(.065f, .048f, .022f), p.Rubber, .007f);
            g.Box(jaw, "Jaw slider", new(0, .13f, -sign * .069f), new(.067f, .044f, .182f), p.Steel, .009f);
            return jaw;
        }

        void Bins(Transform line)
        {
            var output = Group(line, "Route trays and manufacturing buffer");
            foreach (var side in new[] { -1, 1 })
            {
                var z = side * 1.43f;
                var material = side < 0 ? p.Amber : p.Red;
                g.Box(output, "Station tray mounting rails", new(8.65f, .56f, z), new(1.62f, .12f, 1.14f), p.Steel);
                for (var x = 7.96f; x < 9.6f; x += 1.38f)
                    foreach (var s in new[] { -.48f, .48f })
                        g.Box(output, "Tray leg", new(x, .49f, z + s), new(.079f, .93f, .074f), p.Black);
                g.Box(output, "Sloped wall tray base", new(8.65f, .965f, z), new(1.53f, .09f, 1.16f), material, .052f);
                g.Box(output, "Anti-static pocket insert", new(8.65f, 1.003f, z), new(1.36f, .014f, .93f), p.Rubber);
                foreach (var s in new[] { -1, 1 })
                {
                    g.Box(output, "Tray long rim", new(8.65f, 1.105f, z + s * .55f), new(1.47f, .208f, .068f), material, .027f, new(s * 8, 0, 0));
                    g.Box(output, "Tray short rim", new(8.65f + s * .74f, 1.105f, z), new(.069f, .208f, 1.12f), material, .027f, new(0, 0, -s * 7));
                }
                Mark(output, side < 0 ? "REVIEW" : "QUARANTINE", new(8.65f, 1.117f, z - .592f), .087f, TextAnchor.MiddleCenter, Vector3.zero);
            }
            g.Box(output, "Manufacturing buffer support", new(9.68f, .75f, 0), new(3.02f, .32f, 1.16f), p.DarkPanel);
            g.Box(output, "Manufacturing stage guide rail", new(9.66f, 1.138f, -.595f), new(3.15f, .09f, .06f), p.Green);
            g.Box(output, "Manufacturing stage guide rail", new(9.66f, 1.138f, .595f), new(3.15f, .09f, .06f), p.Green);
            for (var i = 0; i < 15; i++)
                g.Cylinder(output, "Pass buffer roller", new(8.20f + .209f * i, 1.07f, 0), .068f, 1.13f, p.Steel, Across);
            Mark(output, "PASS   /   BUFFER", new(10.2f, .972f, -.60f), .089f, TextAnchor.MiddleCenter, Vector3.zero);
            g.Combine(output, "Routed output stations");
        }

        void DisplayWaitingTray(InspectionLane lane)
        {
            var root = Group(lane.root, "Lens optical fixtures");
            for (var i = 0; i < 3; i++)
            {
                var x = 4.9f + i * .95f;
                g.Box(root, "Optics presentation bed", new(x, 1.05f, 0), new(.84f, .18f, 1.14f), p.Black);
                g.Box(root, "Optical carrier stand", new(x, .49f, 0), new(.78f, .8f, 1.06f), p.DarkPanel);
                g.Turn(root, "Machined optical holder", "Lens display holder", new(x, 1.14f, 0), p.Chrome, 54, default,
                    new(.31f, 0), new(.33f, .018f), new(.33f, .073f), new(.27f, .112f), new(.203f, .112f), new(.203f, .013f), new(.31f, 0));
            }
            Mark(root, "PENDING   /   LENS MODEL ONLY", new(6.0f, .97f, -.59f), .083f, TextAnchor.MiddleCenter, Vector3.zero);
        }

        internal void EmergencyStop(Transform root, Vector3 pos)
        {
            g.Box(root, "Emergency switch housing", pos, new(.265f, .156f, .142f), p.Safety, .02f);
            g.Cylinder(root, "Emergency mushroom switch", pos + new Vector3(0, 0, -.085f), .053f, .058f, p.Red, Across);
        }

        static void SavePrefab(Transform root, string name)
            => PrefabUtility.SaveAsPrefabAsset(root.gameObject, $"{Generated}/Prefabs/{name}.prefab");
    }
}
