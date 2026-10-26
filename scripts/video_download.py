#!/usr/bin/env python3
"""Download NASA original clips, trim 6s, scale to 1920px (High Quality), split video/audio."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


# Оригинальные прямые ссылки NASA (гарантированно работают)
VIDEO_URLS = [
    (
        "http://images-assets.nasa.gov/video/KSC-20260515-MH-SPX01-0001-SpaceX_CRS_34_Launch_SLC_40-M21111/KSC-20260515-MH-SPX01-0001-SpaceX_CRS_34_Launch_SLC_40-M21111~orig.mp4",
        "crs34_launch_video.mp4",
        "crs34_launch_audio.m4a",
    ),
    (
        "http://images-assets.nasa.gov/video/KSC-20250801-MH-MTD01-0001-SpaceX_Crew_11_Isolated_Launch_View_Helo_4K_60fps-M14833/KSC-20250801-MH-MTD01-0001-SpaceX_Crew_11_Isolated_Launch_View_Helo_4K_60fps-M14833~orig.mp4",
        "crew11_helo_launch_video.mp4",
        "crew11_helo_launch_audio.m4a",
    ),
]

CUT_SECONDS = 6.0
TARGET_WIDTH = 1920  # Full HD
TARGET_CRF = 18      # Высокое качество (визуально без потерь, лучше стандартного веб-CRF 23)
OUTPUT_DIR = Path(__file__).resolve().parent / "static" / "media" / "launch"


def download(url: str, destination: Path) -> None:
    request = Request(url, headers={"User-Agent": "SpaceY-media-preparation/1.0"})
    try:
        with urlopen(request, timeout=300) as response, destination.open("wb") as output:
            shutil.copyfileobj(response, output)
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError(f"Unable to download: {error}") from error


def probe_media(path: Path) -> tuple[float, set[str]]:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    )
    metadata = json.loads(result.stdout)
    duration = float(metadata["format"]["duration"])
    stream_types = {s["codec_type"] for s in metadata.get("streams", []) if "codec_type" in s}
    return duration, stream_types


def process_video(video_url: str, video_filename: str, audio_filename: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="launch-", dir=OUTPUT_DIR) as temp_dir:
        temp_path = Path(temp_dir)
        source = temp_path / "source.mp4"
        video_temp = temp_path / video_filename
        audio_temp = temp_path / audio_filename

        video_output = OUTPUT_DIR / video_filename
        audio_output = OUTPUT_DIR / audio_filename

        print(f"\nСкачиваю оригинал NASA...")
        download(video_url, source)
        print(f"Размер скачанного: {source.stat().st_size / 1024 / 1024:.1f} MB")

        duration, streams = probe_media(source)
        if duration <= CUT_SECONDS:
            raise RuntimeError(f"Video is {duration:.2f}s, must be > {CUT_SECONDS}s")
        if "video" not in streams or "audio" not in streams:
            raise RuntimeError("File must contain both video and audio.")

        output_duration = duration - CUT_SECONDS
        common_args = ["-hide_banner", "-y", "-ss", str(CUT_SECONDS), "-i", str(source), "-t", f"{output_duration:.6f}"]

        print(f"Конвертирую видео в {TARGET_WIDTH}px (высокое качество, CRF {TARGET_CRF})...")
        subprocess.run(
            [
                "ffmpeg", *common_args,
                "-map", "0:v:0", "-an",
                "-vf", f"scale={TARGET_WIDTH}:-2",  # Масштабирование до 1920px с сохранением пропорций
                "-c:v", "libx264", 
                "-preset", "slow",                  # Медленнее, но качество и сжатие лучше
                "-crf", str(TARGET_CRF),            # 18 = визуально без потерь (лучше стандартного 23)
                "-pix_fmt", "yuv420p", 
                "-movflags", "+faststart",          # Для мгновенного старта в браузере
                str(video_temp),
            ],
            check=True,
        )

        print("Извлекаю аудио (AAC 256k)...")
        subprocess.run(
            ["ffmpeg", *common_args, "-map", "0:a:0", "-vn", "-c:a", "aac", "-b:a", "256k", str(audio_temp)],
            check=True,
        )

        video_temp.replace(video_output)
        audio_temp.replace(audio_output)

        print(f"✓ Видео ({video_output.stat().st_size / 1024 / 1024:.1f} MB): {video_output}")
        print(f"✓ Аудио ({audio_output.stat().st_size / 1024:.0f} KB): {audio_output}")


def main() -> int:
    missing = [t for t in ("ffmpeg", "ffprobe") if shutil.which(t) is None]
    if missing:
        print(f"Missing: {', '.join(missing)}. Install FFmpeg.", file=sys.stderr)
        return 1

    try:
        for url, vname, aname in VIDEO_URLS:
            process_video(url, vname, aname)
        print(f"\n✅ ГОТОВО! Файлы для сайта лежат в: {OUTPUT_DIR}")
        return 0
    except Exception as e:
        print(f"\n❌ Ошибка: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())