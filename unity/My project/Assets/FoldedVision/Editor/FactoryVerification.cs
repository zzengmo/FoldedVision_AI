using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.UI;

namespace FoldedVision.Editor
{
    // 실행 요청은 프로젝트 전용 폴더에서 정해진 동작만 받는다.
    [InitializeOnLoad]
    public static class FactoryVerification
    {
        const string StatusName = "foldedvision-status.txt";
        const string RequestName = "foldedvision.request";
        const string PlayKey = "FoldedVision.VerifyOnPlay";
        const string VideoKey = "FoldedVision.RecordOnPlay";
        static string Project => Directory.GetParent(Application.dataPath).FullName;
        static string LogDir => Path.Combine(Project, "Logs");
        static string Captures => Path.Combine(Project, "Presentation");
        static double nextPoll, nextCheck;
        static IEnumerator checks;
        static readonly List<string> failures = new();

        static FactoryVerification()
        {
            EditorApplication.update += Poll;
            EditorApplication.playModeStateChanged += PlayStateChanged;
            Application.logMessageReceived += RecordErrors;
            if (EditorApplication.isPlaying && SessionState.GetBool(PlayKey, false))
                EditorApplication.delayCall += BeginChecks;
        }

        [MenuItem("Tools/FoldedVision/Verify Play Mode and Capture")]
        public static void VerifyPlayMode() => StartPlayCheck(false);

        [MenuItem("Tools/FoldedVision/Capture Presentation Frames")]
        public static void CapturePresentationFrames() => StartPlayCheck(true);

        static void StartPlayCheck(bool record)
        {
            FactoryBuilder.BuildFactory();
            EnsureSceneOpen();
            if (EditorApplication.isPlaying) throw new InvalidOperationException("Play Mode를 먼저 종료하세요.");
            SessionState.SetBool(PlayKey, true);
            SessionState.SetBool(VideoKey, record);
            Status("starting-play");
            var view = typeof(EditorWindow).Assembly.GetType("UnityEditor.GameView");
            if (view != null) EditorWindow.GetWindow(view).Focus();
            EditorApplication.isPlaying = true;
        }

        static void Poll()
        {
            if (EditorApplication.isPlaying)
            {
                RunChecks();
                return;
            }
            if (EditorApplication.isCompiling || EditorApplication.isUpdating || EditorApplication.isPlayingOrWillChangePlaymode ||
                EditorApplication.timeSinceStartup < nextPoll) return;
            nextPoll = EditorApplication.timeSinceStartup + 1;
            var path = Path.Combine(LogDir, RequestName);
            if (!File.Exists(path)) return;
            try
            {
                var command = File.ReadAllText(path).Trim();
                File.Delete(path);
                Status("processing " + command);
                switch (command)
                {
                    case "build":
                        FactoryBuilder.BuildFactory();
                        Status("built " + FactoryBuilder.FactoryScene);
                        break;
                    case "open":
                        FactoryBuilder.OpenFactory();
                        Status("opened " + FactoryBuilder.FactoryScene);
                        break;
                    case "verify":
                        VerifyPlayMode();
                        break;
                    case "record":
                        CapturePresentationFrames();
                        break;
                    default:
                        Status("ignored unknown operation");
                        break;
                }
            }
            catch (Exception error)
            {
                Status("failed " + error.GetType().Name + " · " + error.Message);
                Debug.LogException(error);
            }
        }

        static void EnsureSceneOpen()
        {
            if (UnityEngine.SceneManagement.SceneManager.GetActiveScene().path != FactoryBuilder.FactoryScene)
                throw new InvalidOperationException("생성한 공정 씬을 열어야 합니다.");
        }

        static void PlayStateChanged(PlayModeStateChange change)
        {
            if (change == PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(PlayKey, false))
                BeginChecks();
            if (change == PlayModeStateChange.EnteredEditMode && SessionState.GetBool(PlayKey, false))
            {
                SessionState.EraseBool(PlayKey);
                SessionState.EraseBool(VideoKey);
                checks = null;
            }
        }

        static void BeginChecks()
        {
            if (checks != null || !EditorApplication.isPlaying) return;
            failures.Clear();
            EditorApplication.isPaused = false;
            var gameView = typeof(EditorWindow).Assembly.GetType("UnityEditor.GameView");
            if (gameView != null) EditorWindow.GetWindow(gameView).Focus();
            nextCheck = EditorApplication.timeSinceStartup + .55;
            Status("playing");
            checks = SessionState.GetBool(VideoKey, false) ? Record() : Verify();
        }

        static void RecordErrors(string message, string stack, LogType type)
        {
            if (!EditorApplication.isPlaying || !SessionState.GetBool(PlayKey, false)) return;
            if (type is LogType.Exception or LogType.Assert ||
                type == LogType.Error && (stack.Contains("FoldedVision") || message.Contains("RenderGraph")))
                failures.Add(message);
        }

        static void RunChecks()
        {
            if (checks != null) EditorApplication.QueuePlayerLoopUpdate();
            if (checks == null || EditorApplication.timeSinceStartup < nextCheck) return;
            try
            {
                if (checks.MoveNext())
                    nextCheck = EditorApplication.timeSinceStartup + (double)checks.Current;
                else
                {
                    Status(SessionState.GetBool(VideoKey, false) ? "frames complete" : "verified");
                    checks = null;
                    EditorApplication.isPlaying = false;
                }
            }
            catch (Exception error)
            {
                Status("verify failed " + error.Message);
                Debug.LogException(error);
                checks = null;
                EditorApplication.isPlaying = false;
            }
        }

        static IEnumerator Verify()
        {
            var sim = UnityEngine.Object.FindAnyObjectByType<FactorySimulation>();
            Require(sim != null && sim.RecordedCount == 6 && sim.lanes.Length == 3, "Packaged replay and three lanes");
            var dashboard = UnityEngine.Object.FindAnyObjectByType<FactoryDashboard>();
            Require(dashboard != null && GraphicsSettings.currentRenderPipeline.GetType().Name.Contains("Universal"),
                "Dashboard and URP");
            sim.DriveSimulationExternally = true;
            Directory.CreateDirectory(Captures);
            var assertionLog = new List<string> { "Unity " + Application.unityVersion, "URP " + GraphicsSettings.currentRenderPipeline.name,
                "Graphics " + SystemInfo.graphicsDeviceName + " / " + SystemInfo.graphicsDeviceType,
                "Game view " + Screen.width + " × " + Screen.height,
                "Capture path: Unity URP, 1920 × 1080, including the runtime canvas" };
            var first = Time.frameCount;
            var start = Time.realtimeSinceStartupAsDouble;
            yield return 2.0;
            var fps = (Time.frameCount - first) / (Time.realtimeSinceStartupAsDouble - start);
            assertionLog.Add($"Editor Game View overview average {fps:0.0} FPS (~2 s, view size above)");
            Debug.Log($"FoldedVision Play Mode frame sample: {fps:0.0} FPS, paused={EditorApplication.isPaused}, focus={Application.isFocused}");
            Capture("01-factory-overview.png", sim, dashboard);
            yield return .85;

            Click("Lens 보기");
            Require(sim.View == FactoryView.Lens && sim.Stage == ProcessStage.Waiting && sim.History.Count == 0, "Lens display only");
            yield return 1.15;
            Capture("02-lens-model.png", sim, dashboard);
            yield return .85;
            Click("검사 2");
            Click("Ring 투입");
            AdvanceUntil(sim, ProcessStage.Moving);
            var ring = sim.lanes.Single(lane => lane.kind == PartKind.Ring);
            var carrier = ring.pool.Single(item => item.activeSelf);
            var before = carrier.transform.position;
            Click("일시정지");
            sim.Advance(3f);
            Require(sim.Paused && before == carrier.transform.position, "Pause preserves the current part position");
            Click("일시정지");
            AdvanceUntil(sim, ProcessStage.Scanning);
            sim.Advance(.49f);
            Require(ring.scan.intensity > 9 && Mathf.Abs(carrier.transform.position.x - FactorySimulation.ScanX) < .002f,
                "Stopped carrier and enabled inspection light");
            yield return 1.1;
            Capture("03-ring-scan.png", sim, dashboard);
            yield return .85;
            AdvanceUntil(sim, ProcessStage.ResultReady);
            Require(sim.VisibleResult.status == "REVIEW" && sim.VisibleResult.has_score && !sim.VisibleResult.has_threshold,
                "Ring uses a type score and REVIEW");
            yield return .2;
            Capture("04-ring-result.png", sim, dashboard);
            yield return .85;
            AdvanceUntil(sim, ProcessStage.Waiting);
            Require(sim.ReviewCount == 1 && sim.PassCount + sim.NgCount == 0 && ring.parked[2] != null, "Ring reached the review tray");

            Click("PCB 투입");
            AdvanceUntil(sim, ProcessStage.ResultReady);
            var pcb = sim.lanes.Single(lane => lane.kind == PartKind.PCB);
            Require(sim.VisibleResult.status == "NG" && sim.VisibleResult.detections.Length > 0 &&
                sim.VisibleResult.has_threshold && sim.VisibleResult.has_time, "PCB NG replay with original box and timing metadata");
            yield return 1.25;
            dashboard.RefreshPresentation();
            Require(UnityEngine.Object.FindObjectsByType<RawImage>(FindObjectsInactive.Exclude)
                .Any(image => image.enabled && image.texture != null), "Inspection image rendered in dashboard");
            Require(GameObject.Find("Prediction / " + sim.VisibleResult.detections[0].label) != null, "PCB bounding box appears in dashboard");
            Capture("05-pcb-result.png", sim, dashboard);
            yield return .85;
            Click("분류 4");
            AdvanceUntil(sim, ProcessStage.Sorting);
            for (var i = 0; i < 328; i++) sim.Advance(.02f);
            var picked = pcb.pool.Single(item => item.activeSelf);
            Require(picked.transform.parent == pcb.grip && picked.transform.position.y > 1.65f, "Gantry grips and lifts the PCB");
            yield return 1.25;
            Capture("06-gantry-sorting.png", sim, dashboard);
            yield return .85;
            AdvanceUntil(sim, ProcessStage.Waiting);
            Require(sim.NgCount == 1 && pcb.parked[1] == picked && picked.transform.parent == pcb.root &&
                Mathf.Abs(picked.transform.localPosition.z - 1.43f) < .003f, "PCB released into the quarantine tray");

            Click("PCB 투입");
            AdvanceUntil(sim, ProcessStage.Waiting, true);
            Require(sim.PassCount == 1 && pcb.parked[0] != null && sim.History.Count == 3, "Stored PCB OK reached the manufacturing buffer");
            Click("검사 기록");
            yield return .22;
            Require(GameObject.Find("History overlay") != null, "History toggle");
            Click("닫기");
            Click("가상 시연");
            Require(!sim.Recorded && sim.History.Count == 0, "Demo has independent session counts");
            for (var i = 0; i < 3; i++)
            {
                Click("PCB 투입");
                AdvanceUntil(sim, ProcessStage.Waiting, true);
            }
            Require(sim.PassCount == 1 && sim.NgCount == 1 && sim.ReviewCount == 1 &&
                sim.History.All(row => row.image_id.StartsWith("DEMO-", StringComparison.Ordinal) && !row.has_score),
                "Demo demonstrates all three routes with explicit synthetic IDs");
            yield return .36;
            Capture("07-simulation-demo.png", sim, dashboard);
            yield return .85;
            Click("기록 결과 재생");
            Click("속도 1×");
            Require(sim.Recorded && sim.Speed == 1.5f, "Mode and speed controls");
            Click("공정 시작");
            Require(sim.Started && sim.Auto, "Continuous mode starts");
            Click("초기화");
            Require(!sim.Started && sim.History.Count == 0 && sim.PassCount + sim.NgCount + sim.ReviewCount == 0, "Reset clears session");
            Click("투어 5");
            Require(sim.View == FactoryView.Tour, "Cinematic tour button");
            Require(failures.Count == 0, string.Join(Environment.NewLine, failures));
            Require(Directory.GetFiles(Captures, "*.png").Count(path => new FileInfo(path).Length > 2000) >= 7,
                "Rendered screenshots were written");
            assertionLog.Add("Verified: Lens model only, Ring REVIEW, PCB NG+PASS and prediction box, gantry attach/release, pause, reset, history, speed, tour, and all demo routes.");
            File.WriteAllLines(Path.Combine(Captures, "verification.txt"), assertionLog);
        }

        static void Click(string name)
        {
            var button = GameObject.Find(name)?.GetComponent<Button>();
            Require(button != null && button.interactable, "Button " + name);
            button.onClick.Invoke();
        }

        static void AdvanceUntil(FactorySimulation sim, ProcessStage stage, bool startNew = false)
        {
            if (startNew) sim.Advance(.02f);
            for (var i = 0; i < 1650 && sim.Stage != stage; i++) sim.Advance(.02f);
            Require(sim.Stage == stage, "Expected stage: " + stage);
        }

        static void Require(bool check, string message)
        {
            if (!check) throw new InvalidOperationException(message);
        }

        static void Capture(string name, FactorySimulation sim, FactoryDashboard dashboard)
        {
            sim.UpdateCamera(1.6f);
            RenderFrame(Path.Combine(Captures, name), sim, dashboard, 1920, 1080);
            Status("capture " + name);
        }

        static IEnumerator Record()
        {
            var sim = UnityEngine.Object.FindAnyObjectByType<FactorySimulation>();
            var dashboard = UnityEngine.Object.FindAnyObjectByType<FactoryDashboard>();
            Require(sim != null && dashboard != null && sim.RecordedCount == 6, "Replay available for video");
            sim.DriveSimulationExternally = true;
            string folder = Path.Combine(LogDir, "PreviewFrames-" + DateTime.Now.ToString("yyyyMMdd-HHmmss"));
            Directory.CreateDirectory(folder);
            File.WriteAllText(Path.Combine(LogDir, "foldedvision-video-frames.txt"), folder);
            var frame = 0;
            const float fps = 24;
            void WriteFrame()
            {
                var path = Path.Combine(folder, $"frame-{frame++:0000}.png");
                RenderFrame(path, sim, dashboard, 1280, 720);
            }

            // 인트로와 광학 부품을 천천히 보여준 뒤 저장 결과의 검사 장면으로 이동한다.
            for (var i = 0; i < 40; i++)
            {
                sim.SetPresentationOrbit(Mathf.Lerp(-7f, 3f, i / 39f), 0);
                sim.UpdateCamera(i == 0 ? 1.6f : 1f / fps);
                WriteFrame();
                yield return 0.0;
            }
            sim.Enqueue(PartKind.Lens);
            for (var i = 0; i < 38; i++)
            {
                sim.SetPresentationOrbit(Mathf.Lerp(-5f, 4f, i / 37f), 0);
                sim.UpdateCamera(i == 0 ? 1.6f : 1f / fps);
                WriteFrame();
                yield return 0.0;
            }
            Status("recording Ring");
            sim.SetView(FactoryView.Follow);
            sim.Enqueue(PartKind.Ring);
            AdvanceUntil(sim, ProcessStage.Moving);
            sim.Advance(2f);
            for (var i = 0; i < 113; i++)
            {
                sim.Advance(.043f);
                if (sim.Stage == ProcessStage.Arrived && sim.View != FactoryView.Inspection)
                {
                    sim.SetView(FactoryView.Inspection);
                    sim.UpdateCamera(1.6f);
                }
                else sim.UpdateCamera(i == 0 ? 1.6f : 1f / fps);
                WriteFrame();
                yield return 0.0;
            }
            AdvanceUntil(sim, ProcessStage.Waiting);
            Status("recording PCB");
            sim.Enqueue(PartKind.PCB);
            AdvanceUntil(sim, ProcessStage.ResultReady);
            sim.SetView(FactoryView.Inspection);
            sim.UpdateCamera(1.6f);
            for (var i = 0; i < 37; i++)
            {
                WriteFrame();
                yield return 0.0;
            }
            sim.SetView(FactoryView.Sorting);
            sim.UpdateCamera(1.6f);
            AdvanceUntil(sim, ProcessStage.Sorting);
            for (var i = 0; i < 222; i++) sim.Advance(.02f);
            for (var i = 0; i < 110; i++)
            {
                sim.Advance(.046f);
                sim.UpdateCamera(1f / fps);
                WriteFrame();
                yield return 0.0;
            }
            Require(sim.NgCount == 1 && sim.ReviewCount == 1 && failures.Count == 0, "Recorded demonstration completed");
        }

        static void RenderFrame(string path, FactorySimulation sim, FactoryDashboard dashboard, int width, int height)
        {
            dashboard.RefreshPresentation();
            var canvas = dashboard.GetComponent<Canvas>();
            var camera = sim.factoryCamera;
            var previousTarget = camera.targetTexture;
            var previousActive = RenderTexture.active;
            var target = RenderTexture.GetTemporary(width, height, 24, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB);
            var photo = new Texture2D(width, height, TextureFormat.RGB24, false);
            try
            {
                camera.targetTexture = target;
                canvas.renderMode = RenderMode.ScreenSpaceCamera;
                canvas.worldCamera = camera;
                canvas.planeDistance = .25f;
                Canvas.ForceUpdateCanvases();
                RenderPipeline.SubmitRenderRequest(camera, new RenderPipeline.StandardRequest { destination = target });
                RenderTexture.active = target;
                photo.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                photo.Apply(false);
                File.WriteAllBytes(path, photo.EncodeToPNG());
            }
            finally
            {
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                canvas.worldCamera = null;
                camera.targetTexture = previousTarget;
                RenderTexture.active = previousActive;
                RenderTexture.ReleaseTemporary(target);
                UnityEngine.Object.Destroy(photo);
            }
        }

        static void Status(string message)
        {
            Directory.CreateDirectory(LogDir);
            File.WriteAllText(Path.Combine(LogDir, StatusName), message);
        }
    }
}
