using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

namespace FoldedVision
{
    public class FactoryDashboard : MonoBehaviour
    {
        public FactorySimulation simulation;
        static readonly Color Ink = new(.035f, .071f, .10f, .97f);
        static readonly Color Panel = new(.075f, .13f, .17f);
        static readonly Color Rule = new(.16f, .24f, .28f);
        static readonly Color Bright = new(.91f, .96f, .97f);
        static readonly Color Dim = new(.57f, .68f, .73f);
        static readonly Color Accent = new(.25f, .90f, .88f);
        readonly Dictionary<string, Texture2D> images = new();
        readonly List<GameObject> boxes = new();
        Text mode, stage, part, status, detail, imageLabel, info, total, pass, ng, review, auto, speed, pause, view, historyText, queue;
        RectTransform imageFrame;
        RawImage photo;
        GameObject historyPanel;
        Font font;
        ReplaySample lastSample;
        bool lastLens, lastRecorded, initialized;
        float nextUpdate;

        void Awake()
        {
            font = Font.CreateDynamicFontFromOSFont(new[] { "Malgun Gothic", "맑은 고딕", "Arial" }, 20);
            if (font == null) font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            BuildInterface();
        }

        void BuildInterface()
        {
            var canvas = gameObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = gameObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1600, 900);
            scaler.matchWidthOrHeight = .65f;
            gameObject.AddComponent<GraphicRaycaster>();
            if (FindAnyObjectByType<EventSystem>() == null)
                new GameObject("Factory input", typeof(EventSystem), typeof(InputSystemUIInputModule));

            var root = GetComponent<RectTransform>();
            var header = Rect(root, "Factory title", 28, 25, 514, 62, new Vector2(0, 1));
            Fill(header, Ink);
            Fill(Rect(header, "Accent", 0, 0, 4, 62), Accent);
            Label(header, "FoldedVision AI Factory", 17, 5, 474, 30, 24, Bright, true);
            Label(header, "제조 투입 전 외관 검사  /  가상 공정", 18, 35, 474, 20, 13, Dim);

            var cameraDock = Rect(root, "Camera controls", 28, -110, 708, 90, new Vector2(0, 0));
            Fill(cameraDock, Ink);
            view = Label(cameraDock, "", 13, 4, 674, 28, 14, Accent, true);
            ViewButton(cameraDock, "전체 1", 12, FactoryView.Overview);
            ViewButton(cameraDock, "검사 2", 123, FactoryView.Inspection);
            ViewButton(cameraDock, "추적 3", 234, FactoryView.Follow);
            ViewButton(cameraDock, "분류 4", 345, FactoryView.Sorting);
            ViewButton(cameraDock, "투어 5", 456, FactoryView.Tour);
            ViewButton(cameraDock, "Lens", 567, FactoryView.Lens);

            var dock = Rect(root, "Operations", -23, 24, 416, 850, new Vector2(1, 1), new Vector2(1, 1));
            Fill(dock, Ink);
            Label(dock, "검사 모니터", 18, 13, 258, 27, 23, Bright, true);
            queue = Label(dock, "", 266, 16, 131, 22, 13, Dim, false, TextAnchor.MiddleRight);
            mode = Label(dock, "", 18, 42, 380, 22, 14, Accent, true);
            Divider(dock, 70);

            part = Label(dock, "", 18, 76, 230, 32, 26, Bright, true);
            status = Label(dock, "", 236, 77, 162, 30, 19, Accent, true, TextAnchor.MiddleRight);
            stage = Label(dock, "", 19, 113, 376, 21, 14, Dim);
            detail = Label(dock, "", 19, 139, 376, 29, 15, Bright);

            imageFrame = Rect(dock, "Inspection photograph", 18, 175, 380, 210);
            Fill(imageFrame, new Color(.03f, .055f, .073f));
            photo = Rect(imageFrame, "Photograph", 0, 0, 380, 210).gameObject.AddComponent<RawImage>();
            photo.raycastTarget = false;
            imageLabel = Label(imageFrame, "", 12, 65, 356, 76, 15, Dim, false, TextAnchor.MiddleCenter);
            info = Label(dock, "", 18, 391, 379, 55, 12, Dim);
            Divider(dock, 452);

            Label(dock, "세션 집계", 18, 459, 197, 25, 17, Bright, true);
            Button(dock, "검사 기록", 295, 457, 103, 25, ToggleHistory, 12);
            total = Counter(dock, "전체", 18, Bright);
            pass = Counter(dock, "PASS", 116, FactorySimulation.RouteColor(Route.Pass));
            ng = Counter(dock, "NG", 214, FactorySimulation.RouteColor(Route.Ng));
            review = Counter(dock, "REVIEW", 312, FactorySimulation.RouteColor(Route.Review));

            Divider(dock, 560);
            Button(dock, "공정 시작", 18, 576, 122, 36, simulation.StartProcess);
            pause = Button(dock, "일시정지", 147, 576, 122, 36, simulation.TogglePause);
            Button(dock, "초기화", 276, 576, 122, 36, simulation.ResetProcess);
            auto = Button(dock, "자동 연속", 18, 620, 183, 36, simulation.ToggleAuto);
            speed = Button(dock, "속도 1×", 208, 620, 190, 36, simulation.CycleSpeed);
            Button(dock, "Lens 보기", 18, 664, 122, 36, () => simulation.Enqueue(PartKind.Lens));
            Button(dock, "Ring 투입", 147, 664, 122, 36, () => simulation.Enqueue(PartKind.Ring));
            Button(dock, "PCB 투입", 276, 664, 122, 36, () => simulation.Enqueue(PartKind.PCB));
            Button(dock, "기록 결과 재생", 18, 708, 183, 36, () => simulation.SelectMode(true));
            Button(dock, "가상 시연", 208, 708, 190, 36, () => simulation.SelectMode(false));
            Divider(dock, 763);
            Label(dock, "공개 데이터 테스트 참조", 18, 772, 380, 23, 13, Accent, true);
            Label(dock, "Ring 유형 정확도 92.86% · 42장\nPCB4 사진 F1 93.02% · 40장", 18, 797, 380, 41, 13, Dim);

            historyPanel = Rect(dock, "History overlay", 11, 169, 394, 387).gameObject;
            Fill((RectTransform)historyPanel.transform, Panel);
            var sheet = (RectTransform)historyPanel.transform;
            Label(sheet, "현재 세션 검사 기록", 14, 8, 247, 27, 18, Bright, true);
            Button(sheet, "닫기", 305, 9, 74, 26, ToggleHistory, 12);
            historyText = Label(sheet, "", 14, 49, 366, 315, 13, Dim, false, TextAnchor.UpperLeft);
            historyPanel.SetActive(false);
        }

        void LateUpdate()
        {
            if (Time.unscaledTime < nextUpdate) return;
            nextUpdate = Time.unscaledTime + .1f;
            RefreshPresentation();
        }

        // 검사 상태를 표시하는 UI는 고정 해상도 캡처에서도 같은 경로로 갱신한다.
        public void RefreshPresentation()
        {
            var lens = simulation.View == FactoryView.Lens;
            var active = simulation.ActiveKind;
            var sample = lens ? null : simulation.VisibleResult;
            var route = sample?.Destination ?? Route.Pending;
            var animation = simulation.Stage;
            mode.text = simulation.Recorded ? "기록 결과 재생  /  공개 테스트" : "공정 시각화 데모 — 가상 검사 결과";
            mode.color = simulation.Recorded ? Accent : FactorySimulation.RouteColor(Route.Review);
            view.text = $"시점  {ViewName(simulation.View)}    ·    우클릭 드래그 / 휠    ·    Space 일시정지";
            queue.text = $"대기 {simulation.QueueCount}";
            part.text = lens ? "Lens" : active == PartKind.PCB ? "PCB" : active.ToString();
            status.text = lens ? "PENDING" : RouteName(route);
            status.color = FactorySimulation.RouteColor(route);
            stage.text = lens ? "광학 모듈 · 검사 설비 모델링" : StageName(animation);
            detail.text = lens ? "최종 모델 연결 대기" :
                sample == null ? simulation.Notice ?? "공정 시작 또는 부품 투입" :
                string.IsNullOrEmpty(sample.defect_type) ? "사진 단위 판정" : DefectName(sample.defect_type);
            var count = simulation.PassCount + simulation.NgCount + simulation.ReviewCount;
            total.text = count.ToString("00");
            pass.text = simulation.PassCount.ToString("00");
            ng.text = simulation.NgCount.ToString("00");
            review.text = simulation.ReviewCount.ToString("00");
            auto.text = simulation.Auto ? "자동 연속 · 켜짐" : "자동 연속 · 꺼짐";
            speed.text = $"속도 {simulation.Speed:0.#}×";
            pause.text = simulation.Paused ? "계속" : "일시정지";
            if (!initialized || lastSample != sample || lastLens != lens || lastRecorded != simulation.Recorded)
            {
                UpdateResult(sample, lens);
                initialized = true;
                lastSample = sample;
                lastLens = lens;
                lastRecorded = simulation.Recorded;
            }
            if (historyPanel.activeSelf) UpdateHistory();
        }

        void UpdateResult(ReplaySample sample, bool lens)
        {
            foreach (var obj in boxes) Destroy(obj);
            boxes.Clear();
            photo.enabled = false;
            imageLabel.gameObject.SetActive(true);
            imageLabel.text = lens ? "곡면 광학 요소 · 고정 링 · 검사 하우징\nLens 모델링 전시" : "검사 결과 대기";
            info.text = lens ? "Lens는 형상과 설비만 전시합니다.\n세션 검사 집계는 Ring과 PCB 기준입니다." : "";
            if (sample == null) return;
            imageLabel.text = simulation.Recorded ? "저장 이미지 미포함" : "3D 시각화 예시\n가상 검사 결과";
            var score = sample.has_score ?
                $"{(sample.part_type == "Ring" ? "유형 점수" : "검출 점수")} {sample.defect_score:0.000}" : null;
            var threshold = sample.has_threshold ? $"판정 기준 {sample.threshold:0.000}" : null;
            var latency = sample.has_time ? $"기록 추론 {sample.inference_ms:0.#} ms" : null;
            var fields = new List<string>();
            foreach (var item in new[] { score, threshold, latency })
                if (!string.IsNullOrEmpty(item)) fields.Add(item);
            info.text = sample.image_id + (fields.Count > 0 ? "\n" + string.Join("  ·  ", fields) : "");
            if (!string.IsNullOrEmpty(sample.model_version)) info.text += "\n" + sample.model_version;

            if (string.IsNullOrEmpty(sample.image_path)) return;
            if (!images.TryGetValue(sample.image_path, out var texture))
            {
                texture = Resources.Load<Texture2D>(sample.image_path);
                images[sample.image_path] = texture;
            }
            if (texture == null) return;
            var scale = Mathf.Min(380f / texture.width, 210f / texture.height);
            var w = texture.width * scale;
            var h = texture.height * scale;
            var rect = photo.rectTransform;
            rect.anchoredPosition = new Vector2((380 - w) * .5f, -(210 - h) * .5f);
            rect.sizeDelta = new Vector2(w, h);
            photo.texture = texture;
            photo.enabled = true;
            imageLabel.gameObject.SetActive(false);
            if (sample.detections == null) return;
            foreach (var item in sample.detections)
            {
                if (item.box == null || item.box.Length != 4 || item.score < sample.threshold) continue;
                var b = item.box;
                var bx = (380 - w) * .5f + b[0] * w;
                var by = (210 - h) * .5f + b[1] * h;
                var bw = (b[2] - b[0]) * w;
                var bh = (b[3] - b[1]) * h;
                if (bw <= 0 || bh <= 0) continue;
                var overlay = Rect(imageFrame, "Prediction / " + item.label, bx, by, bw, bh);
                boxes.Add(overlay.gameObject);
                var mark = new Color(1, .76f, .18f);
                Fill(Rect(overlay, "Top", 0, 0, bw, 2), mark);
                Fill(Rect(overlay, "Bottom", 0, bh - 2, bw, 2), mark);
                Fill(Rect(overlay, "Left", 0, 0, 2, bh), mark);
                Fill(Rect(overlay, "Right", bw - 2, 0, 2, bh), mark);
            }
        }

        void ToggleHistory() => historyPanel.SetActive(!historyPanel.activeSelf);

        void UpdateHistory()
        {
            var buffer = new System.Text.StringBuilder();
            var log = simulation.History;
            for (var i = 0; i < log.Count && i < 11; i++)
                buffer.AppendLine($"{log.Count - i:00}   {log[i].part_type,-5}   {RouteName(log[i].Destination),-8}   {log[i].image_id}");
            historyText.text = buffer.Length == 0 ? "완료된 검사가 없습니다" : buffer.ToString();
        }

        void ViewButton(RectTransform parent, string title, float x, FactoryView target)
            => Button(parent, title, x, 41, 102, 34, () => simulation.SetView(target), 13);

        Text Counter(RectTransform parent, string title, float x, Color color)
        {
            var panel = Rect(parent, title + " counter", x, 492, 86, 55);
            Fill(panel, Panel);
            Label(panel, title, 6, 3, 74, 17, 10, color, true, TextAnchor.MiddleCenter);
            return Label(panel, "00", 6, 19, 74, 32, 23, Bright, true, TextAnchor.MiddleCenter);
        }

        void Divider(RectTransform root, float y) => Fill(Rect(root, "Divider", 18, y, 380, 1), Rule);

        Text Button(RectTransform parent, string title, float x, float y, float w, float h, Action action, int size = 14)
        {
            var target = Rect(parent, title, x, y, w, h);
            var image = Fill(target, Panel);
            image.raycastTarget = true;
            var button = target.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1.6f, 1.8f, 1.9f);
            colors.pressedColor = new Color(.62f, 1.1f, 1.1f);
            button.colors = colors;
            button.onClick.AddListener(() => action());
            return Label(target, title, 0, 0, w, h, size, Bright, true, TextAnchor.MiddleCenter);
        }

        Text Label(RectTransform parent, string value, float x, float y, float w, float h, int size,
            Color color, bool strong = false, TextAnchor alignment = TextAnchor.MiddleLeft)
        {
            var element = Rect(parent, "Label", x, y, w, h);
            var text = element.gameObject.AddComponent<Text>();
            text.font = font;
            text.fontSize = size;
            text.color = color;
            text.alignment = alignment;
            text.fontStyle = strong ? FontStyle.Bold : FontStyle.Normal;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Truncate;
            text.raycastTarget = false;
            text.text = value;
            return text;
        }

        static Image Fill(RectTransform item, Color color)
        {
            var image = item.gameObject.AddComponent<Image>();
            image.color = color;
            image.raycastTarget = false;
            return image;
        }

        static RectTransform Rect(RectTransform parent, string name, float x, float y, float w, float h)
            => Rect(parent, name, x, y, w, h, new Vector2(0, 1));

        static RectTransform Rect(RectTransform parent, string name, float x, float y, float w, float h, Vector2 anchor)
            => Rect(parent, name, x, y, w, h, anchor, new Vector2(0, 1));

        static RectTransform Rect(RectTransform parent, string name, float x, float y, float w, float h, Vector2 anchor, Vector2 pivot)
        {
            var rect = new GameObject(name, typeof(RectTransform)).GetComponent<RectTransform>();
            rect.SetParent(parent, false);
            rect.anchorMin = rect.anchorMax = anchor;
            rect.pivot = pivot;
            rect.anchoredPosition = new Vector2(x, -y);
            rect.sizeDelta = new Vector2(w, h);
            return rect;
        }

        public static string RouteName(Route route) => route switch
        {
            Route.Pass => "PASS", Route.Ng => "NG", Route.Review => "REVIEW", _ => "대기"
        };

        static string StageName(ProcessStage stage) => stage switch
        {
            ProcessStage.Feeding => "공급 트레이 출발", ProcessStage.Moving => "컨베이어 이송",
            ProcessStage.Arrived => "도착 센서 · 위치 고정", ProcessStage.Scanning => "비전 조명 · 촬영 단계",
            ProcessStage.ResultReady => "검사 결과 표시", ProcessStage.Sorting => "분류 구간 · 갠트리 작동",
            ProcessStage.Completed => "분류 완료", _ => "설비 대기"
        };

        static string ViewName(FactoryView value) => value switch
        {
            FactoryView.Inspection => "검사 근접", FactoryView.Follow => "부품 추적",
            FactoryView.Sorting => "분류 갠트리", FactoryView.Lens => "Lens 모델",
            FactoryView.Tour => "시네마틱 투어", _ => "공장 전경"
        };

        static string DefectName(string label) => label switch
        {
            "t_contamination" => "오염", "t_scratch" => "스크래치", "unfinished_surface" => "표면 미가공",
            "pcb4_miss" => "부품 누락", "pcb4_component_damage" => "부품 손상", "pcb4_foreign_material" => "이물",
            "pcb4_oxidation" => "산화", "pcb4_scratch" => "스크래치", _ => label
        };
    }
}
