#!/usr/bin/env python3
"""Prepare Kaflul-specific soundtrack auditions from licensed source tracks.

Source tracks are intentionally kept outside the repository.  The resulting
auditions contain Kaflul's real UI/gameplay effects and a scripted question duck,
so they demonstrate how each musical direction behaves inside the game.
"""

from __future__ import annotations

import json
import math
import subprocess
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/tmp/kaflul-modern-source-2026")
OUT = ROOT / "artifacts" / "music-auditions-modern-2026"
SR = 44_100
DURATION = 52.0

TRACKS = [
    {
        "id": "01",
        "slug": "modern-kpop-adventure",
        "title_he": "פופ־דאנס / K-pop מודרני",
        "file": "01-kpop.wav",
        "start": 18.0,
        "source_title": "K-Pop Rush: Upbeat & Energetic Instrumental",
        "creator": "HauntSync",
        "published": "2025-09-16",
        "source_url": "https://pixabay.com/music/upbeat-k-pop-rush-upbeat-amp-energetic-instrumental-404669/",
        "caption": "קצב פופ־דאנס חד והוק קליט. מרגיש הכי קרוב לעולם של Just Dance וקליפים שילדים פוגשים היום.",
    },
    {
        "id": "02",
        "slug": "afropop-comet-joy",
        "title_he": "אפרו־פופ קצבי",
        "file": "02-afro.wav",
        "start": 20.0,
        "source_title": "Celestial Pulse (Comet Joy) [Instrumental - 113 BPM - One-Stop]",
        "creator": "DjOldCatz",
        "published": "2026-01-06",
        "source_url": "https://pixabay.com/music/afrobeat-celestial-pulse-comet-joy-instrumental-113-bpm-one-stop-460494/",
        "caption": "113 BPM, גרוב אפריקאי חי והפקה אנושית. מקפיץ בלי לעייף ומתאים במיוחד לתנועה ולאיסופים רצופים.",
    },
    {
        "id": "03",
        "slug": "modern-kids-pop-rock",
        "title_he": "פופ־רוק גיבורי",
        "file": "03-poprock.wav",
        "start": 15.0,
        "source_title": "Indie Pop Rock Kids Full",
        "creator": "catch22music",
        "published": "2025-06-16",
        "source_url": "https://pixabay.com/music/pop-indie-pop-rock-kids-full-358931/",
        "caption": "תופים וגיטרות של סדרת אנימציה עכשווית. הכי חזק לתחושת הישג, מרדף ופיצוץ רוחות.",
    },
    {
        "id": "04",
        "slug": "bubblegum-power-pop",
        "title_he": "באבל־פופ צבעוני",
        "file": "04-bubble.wav",
        "start": 16.0,
        "source_title": "Bubblegum Pop Instrumental 01",
        "creator": "alanajordan",
        "published": "2026-01-23",
        "source_url": "https://pixabay.com/music/electronic-bubblegum-pop-instrumental-01-471658/",
        "caption": "באבל־פופ מבריק מ־2026 עם מחיאות, בס והוק צעיר. הכי צבעוני ושובב, בלי אסתטיקת 8-bit.",
    },
]

SFX = [
    (8.20, "assets/audio/sfx/collectible-1.wav", 0.72),
    (10.15, "assets/audio/sfx/collectible-2.wav", 0.72),
    (12.10, "assets/audio/sfx/collectible-3.wav", 0.72),
    (16.05, "assets/audio/sfx/collectible-4.wav", 0.72),
    (18.00, "assets/audio/sfx/bonus-collectible.wav", 0.78),
    (23.60, "assets/audio/sfx/question-open.wav", 0.88),
    (29.15, "assets/audio/sfx/answer-correct-2.wav", 0.95),
    (30.85, "assets/audio/sfx/enemy-defeated.wav", 1.00),
    (31.05, "assets/audio/sfx/reward-power.wav", 0.96),
    (39.85, "assets/audio/sfx/reward-power.wav", 0.90),
    (40.05, "assets/audio/sfx/combo.wav", 0.78),
]


def read_wav(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as w:
        channels, width, rate, frames = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(frames)
    if width != 2:
        raise ValueError(f"Expected 16-bit PCM: {path}")
    data = np.frombuffer(raw, dtype="<i2").astype(np.float64) / 32768.0
    data = data.reshape(-1, channels)
    return data, rate


def resample(audio: np.ndarray, old_rate: int) -> np.ndarray:
    if old_rate == SR:
        return audio
    new_len = round(len(audio) * SR / old_rate)
    old_x = np.linspace(0, 1, len(audio), endpoint=False)
    new_x = np.linspace(0, 1, new_len, endpoint=False)
    return np.column_stack([np.interp(new_x, old_x, audio[:, c]) for c in range(audio.shape[1])])


def stereo(audio: np.ndarray) -> np.ndarray:
    if audio.shape[1] == 1:
        return np.repeat(audio, 2, axis=1)
    return audio[:, :2]


def envelope(audio: np.ndarray, start: float, end: float, floor: float) -> None:
    a, b = int(start * SR), int(end * SR)
    fade = int(0.32 * SR)
    gain = np.full(max(0, b - a), floor)
    if len(gain) > 2 * fade:
        gain[:fade] = np.linspace(1, floor, fade)
        gain[-fade:] = np.linspace(floor, 1, fade)
    audio[a:b] *= gain[:, None]


def mix_sfx(audio: np.ndarray) -> None:
    for at, relative, gain in SFX:
        fx, rate = read_wav(ROOT / relative)
        fx = stereo(resample(fx, rate))
        index = int(at * SR)
        count = min(len(fx), len(audio) - index)
        if count > 0:
            audio[index:index+count] += fx[:count] * gain


def audition(track: dict) -> tuple[np.ndarray, dict]:
    source, rate = read_wav(SOURCE / track["file"])
    source = stereo(resample(source, rate))
    start = int(track["start"] * SR)
    length = int(DURATION * SR)
    audio = source[start:start+length].copy()
    if len(audio) < length:
        audio = np.pad(audio, ((0, length-len(audio)), (0, 0)))

    # Leave headroom for Kaflul's effects, as the production mixer will.
    audio *= 0.68
    envelope(audio, 23.60, 29.15, 0.28)
    # A short extra musical space around the blast keeps the reward readable.
    envelope(audio, 30.72, 31.48, 0.48)
    mix_sfx(audio)
    # Level-match the options so the comparison is about taste rather than the
    # familiar "louder wins" bias.  Repeated gentle saturation controls brief
    # game-effect peaks without flattening the underlying music.
    target_rms = 10 ** (-14.5 / 20)
    for _ in range(3):
        rms_now = float(np.sqrt(np.mean(audio**2)))
        audio *= target_rms / max(rms_now, 1e-9)
        audio = np.tanh(audio * 1.24) / np.tanh(1.24)
    rms_now = float(np.sqrt(np.mean(audio**2)))
    audio *= target_rms / max(rms_now, 1e-9)
    peak = float(np.max(np.abs(audio)))
    audio *= min(1.0, 0.92 / max(peak, 1e-9))
    fade = int(0.025 * SR)
    audio[:fade] *= np.linspace(0, 1, fade)[:, None]
    audio[-fade:] *= np.linspace(1, 0, fade)[:, None]
    rms = float(np.sqrt(np.mean(audio**2)))
    return audio, {
        "duration_seconds": DURATION,
        "sample_rate": SR,
        "channels": 2,
        "rms_dbfs": round(20 * math.log10(max(rms, 1e-9)), 2),
        "peak_dbfs": round(20 * math.log10(max(float(np.max(np.abs(audio))), 1e-9)), 2),
        "timeline": {
            "0-23.6": "movement and collecting",
            "23.6-29.15": "question-open music duck",
            "29.15": "correct answer",
            "30.85": "multi-ghost blast",
            "39.85": "power-up and combo",
        },
    }


def write_wav(path: Path, audio: np.ndarray) -> None:
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for track in TRACKS:
        audio, qa = audition(track)
        wav = OUT / f"{track['id']}-{track['slug']}-kaflul-audition.wav"
        m4a = wav.with_suffix(".m4a")
        write_wav(wav, audio)
        subprocess.run([
            "afconvert", str(wav), "-o", str(m4a), "-f", "m4af",
            "-d", "aac@44100", "-c", "2", "-b", "160000", "-q", "96",
        ], check=True)
        manifest.append({
            **track,
            **qa,
            "license": "Pixabay Content License",
            "license_url": "https://pixabay.com/service/license-summary/",
            "audition": str(m4a.relative_to(ROOT)),
        })
        print(f"{track['id']}: {m4a}")
    (OUT / "auditions.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
