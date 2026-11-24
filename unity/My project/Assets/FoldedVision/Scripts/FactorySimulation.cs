using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace FoldedVision
{
    public enum PartKind { Lens, Ring, PCB }
    public enum Route { Pending, Pass, Ng, Review }
    public enum ProcessStage { Waiting, Feeding, Moving, Arrived, Scanning, ResultReady, Sorting, Completed }
    public enum FactoryView { Overview, Inspection, Follow, Sorting, Lens, Tour }

    [Serializable]
    public class Detection
    {
        public string label;
        public float score;
        public float[] box;
    }

    [Serializable]
    public class ReplaySample
    {
        public string image_id, part_type, model_version, defect_type, status, image_path;
        public float defect_score, threshold, inference_ms;
        public bool has_score, has_threshold, has_time;
        public Detection[] detections;
        public Route Destination => status == "OK" ? Route.Pass : status == "NG" ? Route.Ng : Route.Review;
    }

    [Serializable]
    public class ReplayManifest
    {
        public ReplaySample[] samples;
    }

    [Serializable]
    public class InspectionLane
    {
        public PartKind kind;
        public Transform root, bridge, carriage, head, jawLeft, jawRight, grip, stop;
        public Light scan;
        public Renderer scanRing, indicator, screen, belt;
        public Transform[] rollers, pistons;
        public GameObject partPrefab;
        public float jawGap;

        [NonSerialized] public Material beltInstance;
        [NonSerialized] public float beltOffset;
        [NonSerialized] public GameObject[] pool;
        [NonSerialized] public GameObject[] parked;
    }

    public class FactorySimulation : MonoBehaviour
    {
        public const float FeedX = -8.8f, ScanX = -2.8f, PickX = 3.65f, BeltTop = 1.14f;
        const float CarryY = 2.62f, TransferX = 8.65f;
        const float FeedTime = 1.4f, MoveTime = 4.35f, ExitTime = 4.6f, BeltSpeed = 1.4f;
        static readonly Color Teal = new(0.06f, 0.8f, 0.83f);
        static readonly Color Green = new(0.08f, 0.8f, 0.42f);
        static readonly Color Red = new(1, 0.19f, 0.15f);
        static readonly Color Amber = new(1, 0.55f, 0.13f);
        static readonly int Emission = Shader.PropertyToID("_EmissionColor");

        public InspectionLane[] lanes;
        public Camera factoryCamera;
        public TextAsset recordings;
        public bool autoStart;

        public ProcessStage Stage { get; private set; }
        public FactoryView View { get; private set; }
        public bool Recorded { get; private set; } = true;
        public bool Auto { get; private set; }
        public bool Paused { get; private set; }
        public bool Started { get; private set; }
        public float Speed { get; private set; } = 1f;
        public int PassCount { get; private set; }
        public int NgCount { get; private set; }
        public int ReviewCount { get; private set; }
        public int QueueCount => queue.Count;
        public ReplaySample VisibleResult { get; private set; }
        public PartKind Focus { get; private set; } = PartKind.Ring;
        public PartKind ActiveKind => lane == null ? Focus : lane.kind;
        public IReadOnlyList<ReplaySample> History => history;
        public int RecordedCount => archive.Count;
        public Route CurrentRoute => result?.Destination ?? Route.Pending;
        public string Notice { get; private set; }
        public bool DriveSimulationExternally { get; set; }

        readonly Queue<PartKind> queue = new();
        readonly List<ReplaySample> archive = new(), history = new();
        MaterialPropertyBlock propertyBlock;
        readonly int[] sampleIndex = new int[3];
        InspectionLane lane;
        GameObject part;
        ReplaySample result;
        float elapsed, wait, clock, yaw, pitch, zoom = 1;
        bool attached, dropped, nextPCB, snapCamera;

        void Awake()
        {
            propertyBlock = new MaterialPropertyBlock();
            if (recordings != null)
            {
                var manifest = JsonUtility.FromJson<ReplayManifest>(recordings.text);
                if (manifest?.samples != null)
                    foreach (var sample in manifest.samples)
                    {
                        // Ring은 결함 유형 결과만 사용하며 재검으로 고정한다.
                        if (sample.part_type == "Ring") sample.status = "REVIEW";
                        if ((sample.part_type == "Ring" || sample.part_type == "PCB") &&
                            !string.IsNullOrWhiteSpace(sample.image_id) &&
                            (sample.status == "REVIEW" || sample.status == "OK" || sample.status == "NG"))
                            archive.Add(sample);
                    }
            }
            foreach (var line in lanes)
            {
                if (line.kind == PartKind.Lens) continue;
                line.beltInstance = line.belt.material;
                line.parked = new GameObject[3];
                line.pool = new GameObject[4];
                for (var i = 0; i < line.pool.Length; i++)
                {
                    line.pool[i] = Instantiate(line.partPrefab, line.root);
                    line.pool[i].name = line.kind + " / carrier " + (i + 1);
                    line.pool[i].SetActive(false);
                }
                Prepare(line);
            }
            if (archive.Count == 0) Recorded = false;
            if (autoStart) StartProcess();
            SetView(FactoryView.Overview);
        }

        void OnDestroy()
        {
            foreach (var line in lanes)
                if (line.beltInstance != null) Destroy(line.beltInstance);
        }

        public void StartProcess()
        {
            if (View == FactoryView.Lens) SetView(FactoryView.Overview);
            Started = true;
            Paused = false;
            if (!Auto && queue.Count == 0 && lane == null) Auto = true;
        }

        public void TogglePause()
        {
            if (!Started) StartProcess();
            else Paused = !Paused;
        }

        public void CycleSpeed() => Speed = Speed == 1f ? 1.5f : Speed == 1.5f ? 2f : Speed == 2f ? .5f : 1f;
        public void ToggleAuto() => Auto = !Auto;

        public void SelectMode(bool recorded)
        {
            if (recorded == Recorded) return;
            if (recorded && archive.Count == 0)
            {
                Notice = "재생 데이터가 없습니다";
                return;
            }
            ResetProcess();
            Recorded = recorded;
        }

        public void Enqueue(PartKind kind)
        {
            if (kind == PartKind.Lens)
            {
                SetView(FactoryView.Lens);
                Notice = "Lens · 모델링 전시 / 최종 모델 연결 대기";
                return;
            }
            if (queue.Count >= 6) { Notice = "대기열이 가득 찼습니다"; return; }
            queue.Enqueue(kind);
            if (View == FactoryView.Lens) SetView(FactoryView.Inspection);
            Started = true;
            Notice = null;
        }

        public void ResetProcess()
        {
            queue.Clear();
            history.Clear();
            Array.Clear(sampleIndex, 0, sampleIndex.Length);
            PassCount = NgCount = ReviewCount = 0;
            Stage = ProcessStage.Waiting;
            Started = Auto = Paused = nextPCB = false;
            result = VisibleResult = null;
            lane = null;
            part = null;
            elapsed = wait = 0;
            Notice = null;
            foreach (var line in lanes)
                if (line.kind != PartKind.Lens)
                {
                    Array.Clear(line.parked, 0, line.parked.Length);
                    foreach (var item in line.pool)
                    {
                        item.transform.SetParent(line.root, false);
                        item.SetActive(false);
                    }
                    Prepare(line);
                }
        }

        public void SetView(FactoryView view)
        {
            View = view;
            yaw = pitch = 0;
            zoom = 1;
            if (view == FactoryView.Lens) Focus = PartKind.Lens;
            else if (Focus == PartKind.Lens) Focus = lane?.kind ?? PartKind.Ring;
            snapCamera = !Application.isPlaying || clock == 0;
        }

        public void SetPresentationOrbit(float azimuth, float elevation)
        {
            yaw = Mathf.Clamp(azimuth, -32, 32);
            pitch = Mathf.Clamp(elevation, -8, 14);
        }

        void Update()
        {
            var realTime = Time.unscaledDeltaTime;
            clock += realTime;
            HandleViewInput();
            if (Started && !Paused && !DriveSimulationExternally) Advance(realTime * Speed);
            UpdateCamera(realTime);
        }

        // 물리 충돌 대신 고정 거리와 기계 작동 시간을 가진 결정적 경로를 사용한다.
        public void Advance(float dt)
        {
            if (!Started || Paused || dt <= 0) return;
            if (lane == null)
            {
                wait += dt;
                if (queue.Count > 0) Begin(queue.Dequeue());
                else if (Auto && wait >= .55f)
                {
                    Begin(nextPCB ? PartKind.PCB : PartKind.Ring);
                    nextPCB = !nextPCB;
                }
                if (lane == null) return;
            }
            while (dt > 0 && lane != null)
            {
                var duration = Duration();
                var used = Mathf.Min(dt, duration - elapsed);
                elapsed += used;
                dt -= used;
                Animate(elapsed, used);
                if (elapsed + .00001f < duration) break;
                elapsed = 0;
                Next();
            }
        }

        void Begin(PartKind kind)
        {
            lane = Array.Find(lanes, l => l.kind == kind);
            if (lane == null || lane.kind == PartKind.Lens) { lane = null; return; }
            if (View != FactoryView.Lens) Focus = kind;
            result = NextSample(kind);
            if (result == null) { Notice = "선택한 부품의 저장 결과가 없습니다"; lane = null; return; }
            part = Array.Find(lane.pool, item => !item.activeSelf);
            part.transform.SetParent(lane.root, false);
            OrientPart(FeedX - 1.1f);
            SetDefectShape(part, Recorded ? null : result.defect_type);
            part.SetActive(true);
            attached = dropped = false;
            Stage = ProcessStage.Feeding;
            VisibleResult = null;
            SetIndicator(lane, Teal, .32f);
        }

        ReplaySample NextSample(PartKind kind)
        {
            var serial = sampleIndex[(int)kind]++;
            if (Recorded)
            {
                var matches = archive.FindAll(s => s.part_type == kind.ToString());
                return matches.Count > 0 ? matches[serial % matches.Count] : null;
            }
            var status = serial % 3;
            string[] ringDefects = { "t_contamination", "t_scratch", "unfinished_surface" };
            string[] pcbDefects = { "pcb4_miss", "pcb4_component_damage", "pcb4_foreign_material", "pcb4_oxidation", "pcb4_scratch" };
            return new ReplaySample
            {
                image_id = $"DEMO-{kind}-{serial + 1:00}", part_type = kind.ToString(),
                status = kind == PartKind.Ring ? "REVIEW" : status == 0 ? "OK" : status == 1 ? "NG" : "REVIEW",
                defect_type = kind == PartKind.Ring ? ringDefects[serial % 3] : status == 0 ? null : pcbDefects[(serial / 3 + status) % 5]
            };
        }

        float Duration() => Stage switch
        {
            ProcessStage.Feeding => FeedTime,
            ProcessStage.Moving => MoveTime,
            ProcessStage.Arrived => .45f,
            ProcessStage.Scanning => 1.05f,
            ProcessStage.ResultReady => .82f,
            ProcessStage.Sorting => ExitTime + 4.3f,
            ProcessStage.Completed => .65f,
            _ => .2f
        };

        void Animate(float time, float dt)
        {
            switch (Stage)
            {
                case ProcessStage.Feeding:
                    OrientPart(Mathf.Lerp(FeedX - 1.1f, FeedX, Smooth(time / FeedTime)));
                    StepBelt(lane, dt, .8f);
                    break;
                case ProcessStage.Moving:
                    OrientPart(Mathf.Lerp(FeedX, ScanX, time / MoveTime));
                    StepBelt(lane, dt, (ScanX - FeedX) / MoveTime);
                    break;
                case ProcessStage.Scanning:
                    lane.scan.intensity = 7f + Mathf.Sin(time * Mathf.PI / 1.05f) * 12f;
                    break;
                case ProcessStage.Sorting:
                    if (time < ExitTime)
                    {
                        OrientPart(Mathf.Lerp(ScanX, PickX, time / ExitTime));
                        StepBelt(lane, dt, BeltSpeed);
                    }
                    else
                    {
                        if (time - dt < ExitTime) OrientPart(PickX);
                        MoveGantry(time - ExitTime);
                    }
                    break;
            }
        }

        void Next()
        {
            switch (Stage)
            {
                case ProcessStage.Feeding: Stage = ProcessStage.Moving; break;
                case ProcessStage.Moving:
                    Stage = ProcessStage.Arrived;
                    lane.stop.localPosition = new Vector3(ScanX + .28f, BeltTop + .14f, 0);
                    break;
                case ProcessStage.Arrived:
                    Stage = ProcessStage.Scanning;
                    Glow(lane.scanRing, Teal * 2.5f);
                    break;
                case ProcessStage.Scanning:
                    Stage = ProcessStage.ResultReady;
                    VisibleResult = result;
                    lane.scan.intensity = .8f;
                    Glow(lane.scanRing, Teal * .13f);
                    SetIndicator(lane, RouteColor(result.Destination), 2.4f);
                    break;
                case ProcessStage.ResultReady:
                    lane.stop.localPosition = new Vector3(ScanX + .28f, BeltTop - .15f, 0);
                    Stage = ProcessStage.Sorting;
                    break;
                case ProcessStage.Sorting:
                    Stage = ProcessStage.Completed;
                    CountAndLog();
                    break;
                case ProcessStage.Completed:
                    Stage = ProcessStage.Waiting;
                    wait = 0;
                    part = null;
                    lane = null;
                    break;
            }
        }

        void MoveGantry(float t)
        {
            var destination = result.Destination;
            var slot = destination == Route.Pass ? 0 : destination == Route.Ng ? 1 : 2;
            var destZ = slot == 0 ? 0f : slot == 1 ? 1.43f : -1.43f;
            var destY = slot == 0 ? BeltTop : 1.01f;
            var gripHeight = lane.kind == PartKind.PCB ? .070f : .087f;
            if (t < .58f)
            {
                Pose(lane, PickX, 0, Mathf.Lerp(CarryY, BeltTop + gripHeight, Smooth(t / .58f)), 1);
                return;
            }
            if (t < .84f)
            {
                Pose(lane, PickX, 0, BeltTop + gripHeight, 1f - Smooth((t - .58f) / .26f));
                return;
            }
            if (!attached)
            {
                // 완전히 닫힌 뒤에만 부품을 헤드에 연결한다.
                Pose(lane, PickX, 0, BeltTop + gripHeight, 0);
                part.transform.SetParent(lane.grip, true);
                attached = true;
                var prior = lane.parked[slot];
                if (prior != null) prior.SetActive(false);
                lane.parked[slot] = part;
            }
            if (t < 1.38f)
            {
                Pose(lane, PickX, 0, Mathf.Lerp(BeltTop + gripHeight, CarryY, Smooth((t - .84f) / .54f)), 0);
                return;
            }
            if (t < 2.38f)
            {
                var move = Smooth(t - 1.38f);
                Pose(lane, Mathf.Lerp(PickX, TransferX, move), destZ * move, CarryY, 0);
                return;
            }
            if (t < 2.96f)
            {
                Pose(lane, TransferX, destZ, Mathf.Lerp(CarryY, destY + gripHeight, Smooth((t - 2.38f) / .58f)), 0);
                return;
            }
            if (!dropped)
            {
                Pose(lane, TransferX, destZ, destY + gripHeight, 0);
                part.transform.SetParent(lane.root, true);
                dropped = true;
            }
            if (t < 3.22f)
                Pose(lane, TransferX, destZ, destY + gripHeight, Smooth((t - 2.96f) / .26f));
            else if (t < 3.7f)
                Pose(lane, TransferX, destZ, Mathf.Lerp(destY + gripHeight, CarryY, Smooth((t - 3.22f) / .48f)), 1);
            else
            {
                var move = Smooth((t - 3.7f) / .6f);
                Pose(lane, Mathf.Lerp(TransferX, PickX, move), destZ * (1 - move), CarryY, 1);
            }
        }

        void CountAndLog()
        {
            switch (result.Destination)
            {
                case Route.Pass: PassCount++; break;
                case Route.Ng: NgCount++; break;
                case Route.Review: ReviewCount++; break;
            }
            history.Insert(0, result);
            if (history.Count > 60) history.RemoveAt(60);
        }

        void Prepare(InspectionLane line)
        {
            Pose(line, PickX, 0, CarryY, 1);
            line.stop.localPosition = new Vector3(ScanX + .28f, BeltTop - .15f, 0);
            line.scan.intensity = .8f;
            Glow(line.scanRing, Teal * .13f);
            SetIndicator(line, Teal, .15f);
        }

        void OrientPart(float x) => part.transform.localPosition = new Vector3(x, BeltTop, 0);

        static void Pose(InspectionLane line, float x, float z, float y, float open)
        {
            line.bridge.localPosition = new Vector3(x, 0, 0);
            line.carriage.localPosition = new Vector3(0, 0, z);
            line.head.localPosition = new Vector3(0, y, 0);
            var extension = Mathf.Max(.08f, 3.08f - y - .11f);
            foreach (var rod in line.pistons)
            {
                var xRod = rod.localPosition.x;
                rod.localPosition = new Vector3(xRod, .11f + extension * .5f, 0);
                rod.localScale = new Vector3(1, extension, 1);
            }
            var pad = line.jawGap + open * .075f;
            line.jawLeft.localPosition = new Vector3(0, -.060f, -pad);
            line.jawRight.localPosition = new Vector3(0, -.060f, pad);
        }

        static void StepBelt(InspectionLane line, float dt, float speed)
        {
            line.beltOffset = Mathf.Repeat(line.beltOffset - speed * dt / .32f, 1);
            line.beltInstance.SetTextureOffset("_BaseMap", new Vector2(line.beltOffset, 0));
            foreach (var roller in line.rollers)
                roller.Rotate(Vector3.forward, -speed * dt / .12f * Mathf.Rad2Deg, Space.Self);
        }

        static void SetDefectShape(GameObject item, string label)
        {
            var variants = item.transform.Find("Demo defect overlays");
            if (variants == null) return;
            foreach (Transform child in variants) child.gameObject.SetActive(child.name == label);
            var removable = item.transform.Find("Removable component");
            if (removable != null) removable.gameObject.SetActive(label != "pcb4_miss");
        }

        void SetIndicator(InspectionLane line, Color color, float strength)
        {
            Glow(line.indicator, color * strength);
            Glow(line.screen, color * (.18f + strength * .19f));
        }

        void Glow(Renderer renderer, Color color)
        {
            propertyBlock.Clear();
            propertyBlock.SetColor(Emission, color);
            renderer.SetPropertyBlock(propertyBlock);
        }

        void HandleViewInput()
        {
            var keyboard = Keyboard.current;
            if (keyboard == null) return;
            if (keyboard.spaceKey.wasPressedThisFrame) TogglePause();
            if (keyboard.digit1Key.wasPressedThisFrame) SetView(FactoryView.Overview);
            if (keyboard.digit2Key.wasPressedThisFrame) SetView(FactoryView.Inspection);
            if (keyboard.digit3Key.wasPressedThisFrame) SetView(FactoryView.Follow);
            if (keyboard.digit4Key.wasPressedThisFrame) SetView(FactoryView.Sorting);
            if (keyboard.digit5Key.wasPressedThisFrame) SetView(FactoryView.Tour);
            var mouse = Mouse.current;
            if (mouse != null && mouse.position.ReadValue().x < Screen.width * .72f)
            {
                if (mouse.rightButton.isPressed && View != FactoryView.Tour)
                {
                    var delta = mouse.delta.ReadValue();
                    yaw = Mathf.Clamp(yaw + delta.x * .10f, -32, 32);
                    pitch = Mathf.Clamp(pitch - delta.y * .04f, -8, 14);
                }
                zoom = Mathf.Clamp(zoom - mouse.scroll.ReadValue().y * .00065f, .82f, 1.28f);
            }
        }

        public void UpdateCamera(float dt)
        {
            var focusLane = Array.Find(lanes, l => l.kind == Focus);
            var z = focusLane?.root.position.z ?? 0;
            var view = View == FactoryView.Tour ? ((int)(clock / 6.6f) % 4) switch
            {
                0 => FactoryView.Overview, 1 => FactoryView.Follow, 2 => FactoryView.Inspection, _ => FactoryView.Sorting
            } : View;
            Vector3 target, offset;
            float fov;
            switch (view)
            {
                case FactoryView.Lens:
                    target = new Vector3(-2.82f, 1.32f, z);
                    offset = new Vector3(-.77f, .98f, -2.31f);
                    fov = 30; break;
                case FactoryView.Inspection:
                    target = new Vector3(-2.8f, 1.4f, z);
                    offset = new Vector3(-1.45f, 1.50f, -3.15f);
                    fov = 43; break;
                case FactoryView.Follow:
                    var pos = part != null ? part.transform.position : new Vector3(-7.7f, 1.2f, z);
                    target = pos + new Vector3(.45f, .25f, 0);
                    offset = new Vector3(-3.2f, 2.8f, -4.4f);
                    fov = 40; break;
                case FactoryView.Sorting:
                    target = new Vector3(6.95f, 1.43f, z);
                    offset = new Vector3(3.7f, 4.60f, -6.5f);
                    fov = 41; break;
                default:
                    target = new Vector3(-.32f, 1.14f, .15f);
                    offset = new Vector3(8.5f, 19.5f, -25.2f);
                    fov = 43; break;
            }
            offset = Quaternion.Euler(pitch, yaw, 0) * (offset * zoom);
            var position = target + offset;
            position.z = Mathf.Clamp(position.z, -29f, 7.65f);
            position.x = Mathf.Clamp(position.x, -11f, 16f);
            position.y = Mathf.Max(1.65f, position.y);
            var cameraRotation = Quaternion.LookRotation(target - position);
            // 화면 오른쪽은 운영 화면 영역이므로 설비 중심을 왼쪽으로 보정한다.
            var pan = Mathf.Tan(fov * Mathf.Deg2Rad / 2) * (target - position).magnitude * -.38f;
            cameraRotation = Quaternion.LookRotation(target + cameraRotation * Vector3.right * -pan - position);
            var lerp = snapCamera ? 1f : 1f - Mathf.Exp(-dt * (View == FactoryView.Tour ? 2f : 6f));
            factoryCamera.transform.SetPositionAndRotation(Vector3.Lerp(factoryCamera.transform.position, position, lerp),
                Quaternion.Slerp(factoryCamera.transform.rotation, cameraRotation, lerp));
            factoryCamera.fieldOfView = Mathf.Lerp(factoryCamera.fieldOfView, fov, lerp);
            snapCamera = false;
        }

        public static Color RouteColor(Route route) => route switch
        {
            Route.Pass => Green, Route.Ng => Red, Route.Review => Amber, _ => new Color(.63f, .7f, .73f)
        };

        static float Smooth(float t)
        {
            t = Mathf.Clamp01(t);
            return t * t * (3f - 2f * t);
        }
    }
}
