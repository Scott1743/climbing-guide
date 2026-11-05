#!/usr/bin/env python3
"""Build short teaching GIFs from existing local MP4 clips; never downloads media.

Usage:
  python3 scripts/build-clips.py --source-dir ../bouldering-tutorial/media/clips

Requires ffmpeg and ffprobe on PATH. Inputs retain their original framing,
subtitles and attribution marks. These excerpts remain third-party content.
"""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path


SOURCE = {
    "creator": "Sara Wade / Send Edition",
    "title": "If I Started Climbing in 2025, I'd Do This",
    "original_url": "https://www.youtube.com/watch?v=LSqRurnzkGk",
    "bilibili_url": "https://www.bilibili.com/video/BV1b4pS67EZW/",
}

# id, title, start of existing local MP4 in the original video, excerpt offset,
# excerpt duration. Each selection was inspected before export.
CLIPS = [
    ("feet", "脚尖踩点", 108, 2.5, 12.0),
    ("straight", "直臂与腿部驱动", 295, 7.2, 8.7),
    ("same", "同侧手脚", 340, 18.0, 11.5),
    ("rockover", "Rock over 重心转移", 420, 3.5, 9.0),
    ("reading", "读线与试爬", 574, 13.0, 9.8),
    ("dropknee", "转髋落膝", 674, 17.0, 11.0),
    ("flag", "外旗式", 720, 0.3, 7.0),
    ("backflag", "背旗式", 801, 19.5, 9.7),
    ("swap", "换脚", 211, 3.0, 8.9),
    ("layback", "Layback 手拉脚蹬", 486, 7.8, 9.0),
]


def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def probe(path):
    return json.loads(run(
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
        "-show_entries", "stream=width,height,nb_read_frames,duration:format=duration",
        "-of", "json", str(path),
    ))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    repo = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True,
                        help="Local directory containing the ten existing MP4 clips")
    parser.add_argument("--output-dir", type=Path, default=repo / "assets" / "clips")
    parser.add_argument("--width", type=int, default=448)
    parser.add_argument("--fps", type=int, default=10)
    parser.add_argument("--colors", type=int, default=64)
    args = parser.parse_args()
    if args.width < 160 or not 1 <= args.fps <= 30 or not 4 <= args.colors <= 256:
        parser.error("Use width >= 160, fps 1–30, and colors 4–256")
    for clip_id, _, _, offset, duration in CLIPS:
        source = args.source_dir / f"{clip_id}.mp4"
        if not source.is_file():
            parser.error(f"Missing local input: {source}")
        actual_duration = float(probe(source)["format"]["duration"])
        if offset + duration > actual_duration + 0.02:
            parser.error(f"Excerpt exceeds {source.name}: {actual_duration}s")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    entries = []
    for clip_id, title, source_start, offset, duration in CLIPS:
        source = args.source_dir / f"{clip_id}.mp4"
        gif = args.output_dir / f"{clip_id}.gif"
        poster = args.output_dir / f"{clip_id}.jpg"
        filters = (
            f"fps={args.fps},hqdn3d=4:3:6:4,scale={args.width}:-1:flags=bilinear,"
            "split[video][colors];"
            f"[colors]palettegen=max_colors={args.colors}:reserve_transparent=1[palette];"
            "[video][palette]paletteuse=dither=none:diff_mode=rectangle"
        )
        run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-ss", str(offset), "-i", str(source), "-t", str(duration),
            "-an", "-filter_complex", filters, "-loop", "0", str(gif))
        # Use the GIF's actual first frame so the static/resting image agrees
        # exactly with the start of playback.
        run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(gif), "-frames:v", "1", "-q:v", "2", str(poster))
        info = probe(gif)
        stream = info["streams"][0]
        entries.append({
            "id": clip_id,
            "title": title,
            "gif": f"{clip_id}.gif",
            "poster": f"{clip_id}.jpg",
            "source_start": round(source_start + offset, 1),
            "source_end": round(source_start + offset + duration, 1),
            "local_clip_start": source_start,
            "local_offset": offset,
            "duration": float(info["format"]["duration"]),
            "width": stream["width"],
            "height": stream["height"],
            "fps": args.fps,
            "frames": int(stream["nb_read_frames"]),
            "loop": "infinite",
            "gif_bytes": gif.stat().st_size,
            "poster_bytes": poster.stat().st_size,
            "sha256": digest(gif),
            "source_url": f"{SOURCE['bilibili_url']}?t={source_start + offset:g}",
        })
        print(f"{clip_id}: {entries[-1]['duration']:.1f}s, "
              f"{entries[-1]['frames']} frames, {gif.stat().st_size / 1024**2:.2f} MiB")

    manifest = {
        "source": SOURCE,
        "processing": {
            "framing": "Original full frame; no crop or watermark removal",
            "width": args.width,
            "fps": args.fps,
            "max_colors": args.colors,
            "dither": "none",
            "denoise": "hqdn3d=4:3:6:4",
            "speed": 1,
            "audio": False,
        },
        "total_gif_bytes": sum(c["gif_bytes"] for c in entries),
        "clips": entries,
    }
    (args.output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    client_manifest = {
        c["id"]: {
            "start": c["source_start"], "end": c["source_end"],
            "width": c["width"], "height": c["height"],
            "duration": c["duration"], "fps": c["fps"],
        }
        for c in entries
    }
    (args.output_dir / "manifest.js").write_text(
        "// Generated by scripts/build-clips.py from local video excerpts.\n"
        "window.CLIMBING_CLIPS = " +
        json.dumps(client_manifest, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8")
    print(f"Total: {manifest['total_gif_bytes'] / 1024**2:.2f} MiB")


if __name__ == "__main__":
    main()
