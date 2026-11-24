"""Encode the Unity presentation frames as a portable 720p MP4."""
import json
from pathlib import Path

import cv2


PROJECT = Path(__file__).resolve().parents[1]
LOGS = (PROJECT / "Logs").resolve()
PRESENTATION = PROJECT / "Presentation"
SIZE = (1280, 720)
FPS = 24


def verify(path, frame_count):
    video = cv2.VideoCapture(str(path))
    try:
        assert video.isOpened()
        assert round(video.get(cv2.CAP_PROP_FRAME_COUNT)) == frame_count
        assert round(video.get(cv2.CAP_PROP_FPS)) == FPS
        assert (round(video.get(cv2.CAP_PROP_FRAME_WIDTH)), round(video.get(cv2.CAP_PROP_FRAME_HEIGHT))) == SIZE
        for position in (0, frame_count // 2, frame_count - 1):
            video.set(cv2.CAP_PROP_POS_FRAMES, position)
            ok, frame = video.read()
            assert ok and frame.shape[:2] == SIZE[::-1] and frame.std() > 8
    finally:
        video.release()


def main():
    recorded = (LOGS / "foldedvision-video-frames.txt").read_text(encoding="utf-8").strip()
    frames = Path(recorded).resolve(strict=True)
    if frames.parent != LOGS or not frames.name.startswith("PreviewFrames-"):
        raise ValueError("Expected the Unity capture directory directly inside Logs")
    files = sorted(frames.glob("frame-*.png"))
    if len(files) != 338 or any(file.stem != f"frame-{i:04d}" for i, file in enumerate(files)):
        raise ValueError("The Unity frame sequence is incomplete")

    PRESENTATION.mkdir(exist_ok=True)
    destination = PRESENTATION / "FoldedVision_Factory_Demo.mp4"
    staging = PRESENTATION / "FoldedVision_Factory_Demo.pending.mp4"
    writer = cv2.VideoWriter(str(staging), cv2.VideoWriter_fourcc(*"mp4v"), FPS, SIZE)
    try:
        if not writer.isOpened():
            raise RuntimeError("OpenCV could not start the MP4 writer")
        for path in files:
            frame = cv2.imread(str(path))
            if frame is None or frame.shape[:2] != SIZE[::-1]:
                raise ValueError(f"Invalid Unity render: {path.name}")
            writer.write(frame)
    finally:
        writer.release()
    verify(staging, len(files))
    staging.replace(destination)
    report = {"width": SIZE[0], "height": SIZE[1], "frames": len(files), "fps": FPS,
              "duration_seconds": len(files) / FPS, "source": "Unity URP Play Mode renders"}
    print(json.dumps(report))


if __name__ == "__main__":
    main()
