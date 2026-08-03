#!/usr/bin/env python3
"""Install the selected licensed Afropop direction as a seamless Kaflul loop."""

from __future__ import annotations

import json
import math
import subprocess
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/tmp/kaflul-modern-source-2026/02-afro.wav")
MASTER_WAV = ROOT / "artifacts/music-auditions-modern-2026/selected-afropop-loop-master.wav"
OUTPUT = ROOT / "assets/audio/music/kaflul-afropop-gameplay.m4a"
REPORT = ROOT / "artifacts/music-auditions-modern-2026/selected-afropop-install.json"

SAMPLE_RATE = 44_100
BPM = 113
BEAT_SECONDS = 60 / BPM
# Downbeat detected from the licensed master.  The source span is 25 bars;
# crossfading one bar leaves a metrically exact 24-bar seamless loop.
SOURCE_DOWNBEAT_SECONDS = 19.205
SOURCE_BEATS = 100
CROSSFADE_BEATS = 4
TARGET_RMS_DBFS = -23.0


def read_wav(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as wav:
        channels = wav.getnchannels()
        width = wav.getsampwidth()
        rate = wav.getframerate()
        data = wav.readframes(wav.getnframes())
    if width != 2:
        raise ValueError(f"Expected 16-bit PCM source, got {width * 8}-bit")
    audio = np.frombuffer(data, dtype="<i2").astype(np.float64) / 32768.0
    audio = audio.reshape(-1, channels)
    if channels == 1:
        audio = np.repeat(audio, 2, axis=1)
    return audio[:, :2], rate


def resample(audio: np.ndarray, source_rate: int) -> np.ndarray:
    if source_rate == SAMPLE_RATE:
        return audio
    output_length = round(len(audio) * SAMPLE_RATE / source_rate)
    source_axis = np.linspace(0, 1, len(audio), endpoint=False)
    output_axis = np.linspace(0, 1, output_length, endpoint=False)
    return np.column_stack([
        np.interp(output_axis, source_axis, audio[:, channel])
        for channel in range(audio.shape[1])
    ])


def build_loop(source: np.ndarray) -> np.ndarray:
    start = round(SOURCE_DOWNBEAT_SECONDS * SAMPLE_RATE)
    source_length = round(SOURCE_BEATS * BEAT_SECONDS * SAMPLE_RATE)
    crossfade_length = round(CROSSFADE_BEATS * BEAT_SECONDS * SAMPLE_RATE)
    segment = source[start:start + source_length].copy()
    if len(segment) != source_length:
        raise ValueError("Licensed source is shorter than the requested loop span")

    # Start at the second bar.  The final bar transitions from source bar 25
    # into source bar 1 and lands exactly on the second-bar sample at wrap.
    body = segment[crossfade_length:source_length - crossfade_length]
    outgoing = segment[source_length - crossfade_length:source_length]
    incoming = segment[:crossfade_length]
    phase = np.linspace(0, math.pi / 2, crossfade_length, endpoint=False)
    transition = outgoing * np.cos(phase)[:, None] + incoming * np.sin(phase)[:, None]
    loop = np.concatenate([body, transition], axis=0)

    target_rms = 10 ** (TARGET_RMS_DBFS / 20)
    rms = float(np.sqrt(np.mean(loop**2)))
    loop *= target_rms / max(rms, 1e-9)
    peak = float(np.max(np.abs(loop)))
    if peak > 0.92:
        loop *= 0.92 / peak
    return loop


def write_wav(path: Path, audio: np.ndarray) -> None:
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())


def seam_metrics(loop: np.ndarray) -> dict:
    edge_jump = float(np.max(np.abs(loop[0] - loop[-1])))
    window = round(0.02 * SAMPLE_RATE)
    beginning_rms = float(np.sqrt(np.mean(loop[:window] ** 2)))
    ending_rms = float(np.sqrt(np.mean(loop[-window:] ** 2)))
    rms = float(np.sqrt(np.mean(loop**2)))
    peak = float(np.max(np.abs(loop)))
    return {
        "duration_seconds": round(len(loop) / SAMPLE_RATE, 6),
        "beats": SOURCE_BEATS - CROSSFADE_BEATS,
        "bars_4_4": (SOURCE_BEATS - CROSSFADE_BEATS) // 4,
        "sample_rate": SAMPLE_RATE,
        "channels": 2,
        "rms_dbfs": round(20 * math.log10(max(rms, 1e-9)), 3),
        "peak_dbfs": round(20 * math.log10(max(peak, 1e-9)), 3),
        "edge_jump": round(edge_jump, 6),
        "edge_rms_delta_db": round(20 * math.log10(max(beginning_rms, 1e-9) / max(ending_rms, 1e-9)), 3),
    }


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing licensed source: {SOURCE}")
    source, rate = read_wav(SOURCE)
    loop = build_loop(resample(source, rate))
    MASTER_WAV.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    write_wav(MASTER_WAV, loop)
    subprocess.run([
        "afconvert", str(MASTER_WAV), "-o", str(OUTPUT), "-f", "m4af",
        "-d", "aac@44100", "-c", "2", "-b", "144000", "-q", "96",
    ], check=True)
    report = {
        "output": str(OUTPUT.relative_to(ROOT)),
        "source_title": "Celestial Pulse (Comet Joy) [Instrumental - 113 BPM - One-Stop]",
        "creator": "DjOldCatz",
        "source_url": "https://pixabay.com/music/afrobeat-celestial-pulse-comet-joy-instrumental-113-bpm-one-stop-460494/",
        "license": "Pixabay Content License",
        "license_url": "https://pixabay.com/service/license-summary/",
        "bpm": BPM,
        **seam_metrics(loop),
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
