#!/usr/bin/env python3
"""Generate original, numbered music-direction previews for Kaflul.

These are listening sketches only. They intentionally live under artifacts/
and do not alter the production soundtrack until a direction is approved.
"""

from __future__ import annotations

import json
import math
import wave
from pathlib import Path

import numpy as np

from generate_audio_assets import (
    SR,
    add_glide,
    add_noise,
    add_tone,
    blank,
    midi,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "music-candidates"
RNG = np.random.default_rng(2_026_071_9)


def add_to(target: np.ndarray, start: float, signal: np.ndarray, gain: float = 1.0) -> None:
    index = max(0, int(start * SR))
    if index >= len(target):
        return
    length = min(len(signal), len(target) - index)
    target[index:index + length] += signal[:length] * gain


def decay_envelope(length: int, attack: float, decay: float, release: float = 0.03) -> np.ndarray:
    time = np.arange(length) / SR
    env = np.exp(-time * decay)
    attack_samples = min(length, max(1, int(attack * SR)))
    env[:attack_samples] *= np.linspace(0, 1, attack_samples, endpoint=False)
    release_samples = min(length, max(1, int(release * SR)))
    env[-release_samples:] *= np.linspace(1, 0, release_samples)
    return env


def add_hat(target: np.ndarray, start: float, gain: float = 0.032, open_hat: bool = False) -> None:
    duration = 0.17 if open_hat else 0.055
    length = max(1, int(duration * SR))
    noise = RNG.normal(0, 1, length)
    smooth = np.convolve(noise, np.ones(19) / 19, mode="same")
    signal = noise - smooth
    signal /= np.max(np.abs(signal)) or 1
    signal *= decay_envelope(length, 0.001, 18 if open_hat else 48, 0.025)
    add_to(target, start, signal, gain)


def add_snare(target: np.ndarray, start: float, gain: float = 0.08, clap: bool = False) -> None:
    bursts = (0.0, 0.018, 0.037) if clap else (0.0,)
    for offset in bursts:
        add_noise(target, start + offset, 0.14, gain / math.sqrt(len(bursts)), 3,
                  attack=0.001, release=0.055, decay=18)
    add_tone(target, start, 0.13, 182, gain * 0.52, "triangle", 0.001, 0.045, 18)


def add_bass(target: np.ndarray, start: float, note: float, duration: float,
             gain: float = 0.10, rubber: bool = False) -> None:
    freq = midi(note)
    kind = "triangle" if rubber else "sine"
    add_tone(target, start, duration, freq, gain, kind, 0.004, 0.07, 3.8,
             ((2, 0.13 if rubber else 0.06),))
    add_tone(target, start, min(duration, 0.26), freq * 0.5, gain * 0.35,
             "sine", 0.003, 0.06, 5.5)


def add_mallet(target: np.ndarray, start: float, note: float, gain: float = 0.075,
               duration: float = 0.34, wooden: bool = True) -> None:
    freq = midi(note)
    harmonics = ((2, 0.22), (3.01, 0.08)) if wooden else ((2.01, 0.30), (4.1, 0.08))
    add_tone(target, start, duration, freq, gain, "triangle" if wooden else "sine",
             0.002, 0.09, 6.8, harmonics)
    add_noise(target, start, min(0.035, duration), gain * 0.14, 2,
              attack=0.001, release=0.02, decay=36)


def add_chip(target: np.ndarray, start: float, note: float, gain: float = 0.038,
             duration: float = 0.18) -> None:
    freq = midi(note)
    add_tone(target, start, duration, freq, gain, "square", 0.003, 0.04, 4.2)
    add_tone(target, start, duration, freq * 0.5, gain * 0.42, "triangle", 0.003, 0.05, 4.8)


def add_oud(target: np.ndarray, start: float, note: float, gain: float = 0.065,
            duration: float = 0.40) -> None:
    freq = midi(note)
    add_tone(target, start, duration, freq, gain, "triangle", 0.002, 0.11, 7.2,
             ((2.0, 0.24), (3.0, 0.09), (4.0, 0.04)))
    add_tone(target, start + 0.009, duration * 0.72, freq * 1.003, gain * 0.24,
             "sine", 0.002, 0.08, 8.2)
    add_noise(target, start, 0.025, gain * 0.10, 2, release=0.018, decay=42)


def add_brass_stab(target: np.ndarray, start: float, notes: tuple[int, ...],
                   gain: float = 0.032, duration: float = 0.24) -> None:
    for index, note in enumerate(notes):
        add_tone(target, start + index * 0.004, duration, midi(note), gain,
                 "triangle", 0.018, 0.07, 4.8, ((2, 0.20), (3, 0.07)))


def add_darbuka(target: np.ndarray, start: float, gain: float = 0.09,
                high: bool = False) -> None:
    if high:
        add_tone(target, start, 0.09, 310, gain * 0.55, "triangle", 0.001, 0.035, 22)
        add_noise(target, start, 0.055, gain * 0.55, 2, release=0.025, decay=35)
    else:
        add_glide(target, start, 0.16, 205, 78, gain, "sine", 13)
        add_noise(target, start, 0.045, gain * 0.18, 5, release=0.025, decay=30)


def add_standard_drums(target: np.ndarray, bar_start: float, beat: float,
                       energy: float = 1.0, funk: bool = False) -> None:
    kicks = (0, 1.5, 2.5, 3.25) if funk else (0, 2)
    for position in kicks:
        add_glide(target, bar_start + position * beat, 0.16, 145, 52,
                  0.082 * energy, "sine", 13)
    for position in (1, 3):
        add_snare(target, bar_start + position * beat, 0.066 * energy, clap=funk)
    for eighth in range(8):
        if funk and eighth in (2, 6):
            continue
        accent = 1.18 if eighth in (0, 4) else 0.72
        add_hat(target, bar_start + eighth * beat * 0.5,
                0.024 * energy * accent, open_hat=(funk and eighth == 7))


def master(data: np.ndarray, target_rms: float = 0.105) -> np.ndarray:
    data = data - float(np.mean(data))
    rms = math.sqrt(float(np.mean(np.square(data)))) if len(data) else 0
    if rms > 0:
        data *= target_rms / rms
    data = np.tanh(data * 1.16) / np.tanh(1.16)
    peak = float(np.max(np.abs(data))) if len(data) else 0
    if peak > 0.88:
        data *= 0.88 / peak
    fade = min(len(data) // 8, int(0.025 * SR))
    data[:fade] *= np.linspace(0, 1, fade)
    data[-fade:] *= np.linspace(1, 0, fade)
    return data


def write_wav(filename: str, data: np.ndarray) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / filename
    pcm = np.int16(np.clip(master(data), -1, 1) * 32767)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(pcm.tobytes())
    return path


def candidate_arcade_adventure() -> np.ndarray:
    bpm, bars, root = 116, 24, 50
    beat = 60 / bpm
    data = blank(bars * 4 * beat)
    roots = (0, 5, 10, 7, 0, 5, 3, 7)
    motifs = (
        ((0.25, 0), (0.75, 2), (1.25, 3), (2.0, 7), (3.0, 5)),
        ((0.0, 3), (0.5, 5), (1.5, 7), (2.25, 10), (3.25, 7)),
        ((0.25, 7), (1.0, 9), (1.75, 10), (2.5, 7), (3.0, 5)),
    )
    for bar in range(bars):
        start = bar * 4 * beat
        chord_root = root + roots[bar % len(roots)]
        add_standard_drums(data, start, beat, 0.86 if bar % 8 == 0 else 1.0)
        for position, length, step in ((0, 0.55, 0), (1.5, 0.38, 0), (2.5, 0.55, 7), (3.5, 0.28, 0)):
            add_bass(data, start + position * beat, chord_root - 12 + step,
                     length * beat, 0.086, rubber=True)
        for position in (0.5, 2.5):
            add_brass_stab(data, start + position * beat,
                           (chord_root, chord_root + 3, chord_root + 7), 0.019, 0.22)
        motif = motifs[(bar // 8) % len(motifs)]
        if bar % 2 == 0 or bar >= 16:
            for position, degree in motif:
                add_mallet(data, start + position * beat, root + 12 + degree,
                           0.059 if bar < 16 else 0.066, 0.30, wooden=True)
        if bar in (7, 15, 23):
            for index, degree in enumerate((0, 3, 7, 10, 12)):
                add_mallet(data, start + (2.0 + index * 0.34) * beat,
                           root + 12 + degree, 0.052, 0.24, wooden=False)
    return data


def candidate_cartoon_funk() -> np.ndarray:
    bpm, bars, root = 124, 24, 52
    beat = 60 / bpm
    data = blank(bars * 4 * beat)
    roots = (0, -2, 5, 3, 0, 7, 5, -2)
    hook = ((0.25, 0), (0.75, 4), (1.25, 7), (2.0, 10), (2.5, 7), (3.25, 4))
    answer = ((0.0, 7), (0.5, 10), (1.0, 12), (2.0, 9), (2.75, 7))
    for bar in range(bars):
        start = bar * 4 * beat
        chord_root = root + roots[bar % len(roots)]
        add_standard_drums(data, start, beat, 1.02, funk=True)
        for position, degree, length in ((0, 0, .42), (.75, 0, .25), (1.5, 7, .34),
                                         (2.5, 0, .38), (3.25, 10, .24), (3.75, 7, .18)):
            add_bass(data, start + position * beat, chord_root - 12 + degree,
                     length * beat, 0.092, rubber=True)
        if bar % 2 == 0:
            add_brass_stab(data, start + 0.5 * beat,
                           (chord_root + 12, chord_root + 16, chord_root + 22), 0.026)
            add_brass_stab(data, start + 2.75 * beat,
                           (chord_root + 12, chord_root + 16, chord_root + 19), 0.023)
        phrase = hook if (bar // 4) % 2 == 0 else answer
        if bar % 4 in (1, 2):
            for position, degree in phrase:
                add_mallet(data, start + position * beat, root + 12 + degree,
                           0.054, 0.22, wooden=False)
        if bar in (7, 15, 23):
            add_brass_stab(data, start + 3.25 * beat,
                           (root + 12, root + 19, root + 22, root + 28), 0.030, 0.30)
    return data


def candidate_mediterranean_quest() -> np.ndarray:
    bpm, bars, root = 112, 24, 50
    beat = 60 / bpm
    data = blank(bars * 4 * beat)
    roots = (0, 5, 7, 0, 0, 8, 7, 0)
    motifs = (
        ((0.0, 0), (0.5, 1), (1.0, 4), (1.75, 5), (2.5, 4), (3.25, 1)),
        ((0.25, 7), (0.75, 8), (1.5, 10), (2.0, 8), (2.75, 7), (3.5, 5)),
    )
    for bar in range(bars):
        start = bar * 4 * beat
        chord_root = root + roots[bar % len(roots)]
        for eighth in range(8):
            position = eighth * 0.5
            if eighth in (0, 5):
                add_darbuka(data, start + position * beat, 0.087, high=False)
            elif eighth in (2, 3, 6, 7):
                add_darbuka(data, start + position * beat, 0.054, high=True)
            if eighth not in (1, 5):
                add_hat(data, start + position * beat, 0.014)
        add_bass(data, start, chord_root - 12, 0.72 * beat, 0.075)
        add_bass(data, start + 2.5 * beat, chord_root - 5, 0.48 * beat, 0.062)
        # Short drone pulses establish the mode without creating a slow pad.
        for position in (0.25, 2.25):
            add_tone(data, start + position * beat, 0.42 * beat, midi(root - 12),
                     0.026, "sine", 0.02, 0.08, 2.8)
            add_tone(data, start + position * beat, 0.42 * beat, midi(root - 5),
                     0.019, "triangle", 0.02, 0.08, 3.2)
        phrase = motifs[(bar // 4) % 2]
        if bar % 2 == 0 or bar in (11, 15, 19, 23):
            for position, degree in phrase:
                add_oud(data, start + position * beat, root + 12 + degree, 0.060, 0.34)
        if bar in (7, 15, 23):
            for index, degree in enumerate((0, 1, 4, 5, 7, 12)):
                add_oud(data, start + (1.9 + index * 0.30) * beat,
                        root + 12 + degree, 0.052, 0.27)
    return data


def candidate_pixel_hero() -> np.ndarray:
    bpm, bars, root = 128, 24, 48
    beat = 60 / bpm
    data = blank(bars * 4 * beat)
    roots = (0, 5, 9, 7, 0, 5, 2, 7)
    arpeggios = ((0, 4, 7, 12), (0, 3, 7, 10), (0, 4, 7, 9))
    lead = ((0.0, 0), (0.5, 4), (1.0, 7), (1.5, 12), (2.5, 9), (3.25, 7))
    for bar in range(bars):
        start = bar * 4 * beat
        chord_root = root + roots[bar % len(roots)]
        add_standard_drums(data, start, beat, 0.88, funk=(bar >= 16))
        for quarter in range(4):
            add_bass(data, start + quarter * beat, chord_root - 12,
                     0.42 * beat, 0.066, rubber=True)
        chord = arpeggios[(bar // 8) % len(arpeggios)]
        # Alternating bars create breathing room; this is intentionally not a
        # nonstop arpeggio wall.
        if bar % 2 == 0 or 8 <= bar < 12:
            for eighth in range(8):
                degree = chord[eighth % len(chord)]
                add_chip(data, start + eighth * 0.5 * beat,
                         chord_root + 12 + degree, 0.026, 0.24 * beat)
        if bar % 4 in (1, 3):
            for position, degree in lead:
                add_chip(data, start + position * beat, root + 24 + degree,
                         0.036, 0.28 * beat)
        if bar in (7, 15, 23):
            for index, degree in enumerate((0, 4, 7, 12, 16)):
                add_chip(data, start + (2.1 + index * 0.34) * beat,
                         root + 24 + degree, 0.040, 0.25 * beat)
    return data


def candidate_mischievous_mystery() -> np.ndarray:
    bpm, bars, root = 108, 24, 45
    beat = 60 / bpm
    data = blank(bars * 4 * beat)
    roots = (0, 3, 5, 7, 0, 10, 5, 7)
    motifs = (
        ((0.0, 7), (0.75, 5), (1.5, 3), (2.5, 2), (3.25, 0)),
        ((0.25, 0), (1.0, 3), (1.75, 7), (2.75, 5), (3.5, 3)),
    )
    for bar in range(bars):
        start = bar * 4 * beat
        chord_root = root + roots[bar % len(roots)]
        for position in (0, 2.5):
            add_glide(data, start + position * beat, 0.15, 126, 50,
                      0.060, "sine", 14)
        for position in (1, 3):
            add_snare(data, start + position * beat, 0.045, clap=False)
        for eighth in range(8):
            if eighth not in (3, 7):
                add_hat(data, start + eighth * 0.5 * beat, 0.016)
        for position, degree in ((0, 0), (1.5, 7), (2.5, 0), (3.5, 5)):
            add_bass(data, start + position * beat, chord_root - 12 + degree,
                     0.42 * beat, 0.065)
        if bar % 2 == 0:
            for position, degree in motifs[(bar // 8) % 2]:
                add_mallet(data, start + position * beat, root + 12 + degree,
                           0.056, 0.32, wooden=True)
        else:
            for position, degree in ((0.5, 0), (2.0, 3), (3.0, 7)):
                add_mallet(data, start + position * beat, chord_root + 12 + degree,
                           0.034, 0.26, wooden=False)
        if bar in (7, 15, 23):
            add_tone(data, start + 3.1 * beat, 0.62 * beat, midi(root + 24),
                     0.040, "sine", 0.008, 0.12, 4.2, ((2.01, .18),))
    return data


CANDIDATES = (
    {
        "number": 1,
        "slug": "arcade-adventure",
        "title": "הרפתקת ארקייד",
        "bpm": 116,
        "feeling": "נועזת, משחקית ומקדמת קדימה; הוק מרימבה וכלי הקשה קלים.",
        "generator": candidate_arcade_adventure,
    },
    {
        "number": 2,
        "slug": "cartoon-funk",
        "title": "פאנק מצויר",
        "bpm": 124,
        "feeling": "קופצנית, מצחיקה ובטוחה בעצמה; בס מסונקף וסטאבים קצרים.",
        "generator": candidate_cartoon_funk,
    },
    {
        "number": 3,
        "slug": "mediterranean-quest",
        "title": "מסע ים־תיכוני",
        "bpm": 112,
        "feeling": "הרפתקה חמה ומקומית; פריטות עוד ודופק דרבוקה שובבי.",
        "generator": candidate_mediterranean_quest,
    },
    {
        "number": 4,
        "slug": "pixel-hero",
        "title": "גיבור פיקסל",
        "bpm": 128,
        "feeling": "ארקייד קלאסי ואנרגטי, אבל רך מספיק לתרגול מתמשך.",
        "generator": candidate_pixel_hero,
    },
    {
        "number": 5,
        "slug": "mischievous-mystery",
        "title": "תעלומת המבוך",
        "bpm": 108,
        "feeling": "סקרנית, שובבה ומעט מסתורית; רגועה בלי להישמע כמו מעלית.",
        "generator": candidate_mischievous_mystery,
    },
)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    report = {
        "purpose": "Kaflul background-music direction selection",
        "productionChanged": False,
        "sampleRate": SR,
        "candidates": [],
    }
    for candidate in CANDIDATES:
        filename = f"{candidate['number']:02d}-{candidate['slug']}.wav"
        data = candidate["generator"]()
        path = write_wav(filename, data)
        rms = math.sqrt(float(np.mean(np.square(master(data)))))
        report["candidates"].append({
            "number": candidate["number"],
            "title": candidate["title"],
            "bpm": candidate["bpm"],
            "feeling": candidate["feeling"],
            "wav": path.name,
            "durationSeconds": round(len(data) / SR, 3),
            "rms": round(rms, 5),
        })
        print(f"{candidate['number']}. {candidate['title']} -> {path}")
    (OUT / "candidates.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
