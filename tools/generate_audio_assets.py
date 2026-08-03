#!/usr/bin/env python3
"""Generate the original Kaflul production-audio pack.

The pack is intentionally synthesized from first principles so the repository
does not depend on stock libraries, unclear licenses, or network playback.
"""

from __future__ import annotations

import json
import math
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio"
SR = 24_000
RNG = np.random.default_rng(947_311)


def blank(seconds: float) -> np.ndarray:
    return np.zeros(max(1, int(seconds * SR)), dtype=np.float64)


def oscillator(freq: float, seconds: float, kind: str = "sine", phase: float = 0.0) -> np.ndarray:
    t = np.arange(max(1, round(seconds * SR))) / SR
    x = 2 * np.pi * freq * t + phase
    if kind == "triangle":
        return 2 / np.pi * np.arcsin(np.sin(x))
    if kind == "square":
        return np.sign(np.sin(x))
    if kind == "saw":
        return 2 * ((freq * t + phase / (2 * np.pi)) % 1) - 1
    return np.sin(x)


def envelope(length: int, attack: float, release: float, decay: float = 0.0) -> np.ndarray:
    env = np.ones(length)
    a = min(length, max(1, int(attack * SR)))
    r = min(length, max(1, int(release * SR)))
    env[:a] = np.linspace(0, 1, a, endpoint=False)
    if decay > 0:
        env *= np.exp(-np.arange(length) / SR * decay)
    env[-r:] *= np.linspace(1, 0, r)
    return env


def add_tone(target: np.ndarray, start: float, duration: float, freq: float,
             gain: float = 0.25, kind: str = "sine", attack: float = 0.008,
             release: float = 0.08, decay: float = 0.0, harmonics: tuple[tuple[float, float], ...] = ()) -> None:
    i = int(start * SR)
    if i >= len(target):
        return
    n = min(len(target) - i, max(1, int(duration * SR)))
    signal = oscillator(freq, n / SR, kind)[:n]
    for multiple, amount in harmonics:
        signal += oscillator(freq * multiple, n / SR, "sine")[:n] * amount
    signal *= envelope(n, attack, min(release, n / SR * 0.45), decay)
    target[i:i + n] += signal * gain


def add_glide(target: np.ndarray, start: float, duration: float, f0: float, f1: float,
              gain: float = 0.2, kind: str = "sine", decay: float = 2.0) -> None:
    i = int(start * SR)
    n = min(len(target) - i, max(1, int(duration * SR)))
    if n <= 0:
        return
    freqs = np.geomspace(max(20, f0), max(20, f1), n)
    phase = 2 * np.pi * np.cumsum(freqs) / SR
    if kind == "triangle":
        signal = 2 / np.pi * np.arcsin(np.sin(phase))
    elif kind == "saw":
        signal = 2 * ((phase / (2 * np.pi)) % 1) - 1
    else:
        signal = np.sin(phase)
    signal *= envelope(n, 0.006, min(0.1, duration * 0.4), decay)
    target[i:i + n] += signal * gain


def filtered_noise(seconds: float, smooth: int = 7) -> np.ndarray:
    data = RNG.normal(0, 1, max(1, int(seconds * SR)))
    if smooth > 1:
        kernel = np.ones(smooth) / smooth
        data = np.convolve(data, kernel, mode="same")
    peak = np.max(np.abs(data)) or 1
    return data / peak


def add_noise(target: np.ndarray, start: float, duration: float, gain: float = 0.12,
              smooth: int = 7, attack: float = 0.005, release: float = 0.1, decay: float = 4.0) -> None:
    i = int(start * SR)
    n = min(len(target) - i, max(1, int(duration * SR)))
    if n <= 0:
        return
    signal = filtered_noise(n / SR, smooth)[:n]
    signal *= envelope(n, attack, min(release, duration * 0.45), decay)
    target[i:i + n] += signal * gain


def add_pluck(target: np.ndarray, start: float, freq: float, gain: float = 0.22, duration: float = 0.42) -> None:
    add_tone(target, start, duration, freq, gain, "triangle", 0.003, 0.12, 5.6,
             ((2, 0.18), (3, 0.08)))


def add_bell(target: np.ndarray, start: float, freq: float, gain: float = 0.18, duration: float = 0.9) -> None:
    add_tone(target, start, duration, freq, gain, "sine", 0.002, 0.22, 2.8,
             ((2, 0.35), (3.01, 0.14), (4.2, 0.08)))


def add_kick(target: np.ndarray, start: float, gain: float = 0.18) -> None:
    add_glide(target, start, 0.18, 150, 52, gain, "sine", 12)
    add_noise(target, start, 0.035, gain * 0.22, 2, release=0.025, decay=30)


def add_tick(target: np.ndarray, start: float, gain: float = 0.09, wooden: bool = False) -> None:
    freq = 720 if wooden else 1450
    add_tone(target, start, 0.075, freq, gain, "triangle", 0.001, 0.045, 24,
             ((1.49, 0.22),))
    add_noise(target, start, 0.035, gain * 0.35, 3 if wooden else 1, release=0.025, decay=30)


def finalize(data: np.ndarray, peak: float = 0.82) -> np.ndarray:
    if len(data) > 24:
        fade = min(int(0.008 * SR), len(data) // 4)
        data[:fade] *= np.linspace(0, 1, fade)
        data[-fade:] *= np.linspace(1, 0, fade)
    max_value = float(np.max(np.abs(data))) if len(data) else 0
    if max_value > 0:
        data = data * min(1.0, peak / max_value)
    return np.tanh(data * 1.05) / np.tanh(1.05)


def write_wav(relative: str, data: np.ndarray, peak: float = 0.82) -> None:
    path = OUT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.int16(np.clip(finalize(data, peak), -1, 1) * 32767)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(pcm.tobytes())


def midi(note: float) -> float:
    return 440 * 2 ** ((note - 69) / 12)


def make_ui_sfx() -> list[str]:
    created: list[str] = []

    def tones(name: str, notes: list[tuple[float, float, float]], duration: float = 0.7,
              kind: str = "triangle", noise: float = 0.0) -> None:
        data = blank(duration)
        for at, note, gain in notes:
            add_pluck(data, at, midi(note), gain, min(0.5, duration - at)) if kind == "pluck" else add_tone(
                data, at, min(0.45, duration - at), midi(note), gain, kind, 0.003, 0.1, 6.0)
        if noise:
            add_noise(data, 0, min(duration, 0.18), noise, 5)
        write_wav(f"sfx/{name}.wav", data)
        created.append(f"sfx/{name}.wav")

    tones("button-press", [(0.00, 66, .16)], .16, "triangle", .025)
    tones("primary-play", [(0.00, 64, .18), (.09, 69, .20), (.18, 73, .18)], .55, "pluck")
    tones("panel-open", [(0.00, 59, .12), (.065, 64, .14)], .34, "pluck")
    tones("panel-close", [(0.00, 59, .13), (.055, 55, .10)], .28, "triangle")
    tones("tab-change", [(0.00, 69, .13)], .18, "pluck")
    tones("locked-action", [(0.00, 47, .13), (.10, 45, .11)], .38, "triangle", .015)
    tones("notification", [(0.00, 72, .12), (.08, 76, .10)], .38, "sine")
    tones("keypad-digit", [(0.00, 70, .12)], .13, "triangle", .015)
    tones("keypad-delete", [(0.00, 57, .11)], .15, "sine", .012)
    tones("keypad-submit", [(0.00, 67, .14), (.055, 71, .12)], .26, "pluck")
    tones("pause", [(0.00, 64, .12), (.08, 59, .10)], .28, "sine")
    tones("resume", [(0.00, 59, .11), (.07, 64, .13)], .3, "pluck")

    tones("question-open", [(0.00, 55, .13), (.08, 62, .15)], .45, "sine", .05)
    tones("question-reward", [(0.00, 72, .14), (.06, 76, .14), (.13, 81, .12)], .62, "sine")
    tones("question-boss", [(0.00, 38, .18), (.11, 50, .15)], .62, "triangle", .08)
    tones("answer-correct-1", [(0.00, 67, .19), (.085, 72, .22)], .5, "pluck")
    tones("answer-correct-2", [(0.00, 69, .18), (.075, 74, .20)], .48, "pluck")
    tones("answer-correct-3", [(0.00, 64, .16), (.065, 69, .19), (.14, 76, .15)], .6, "pluck")
    tones("answer-wrong-1", [(0.00, 55, .14), (.10, 52, .11)], .48, "triangle", .02)
    tones("answer-wrong-2", [(0.00, 57, .13), (.10, 53, .10)], .48, "sine", .025)
    tones("answer-timeout", [(0.00, 62, .10), (.11, 59, .10), (.23, 55, .09)], .62, "sine")
    tones("timer-tick", [(0.00, 76, .08)], .12, "sine")
    tones("combo", [(0.00, 69, .15), (.06, 73, .16), (.12, 76, .17)], .52, "pluck")
    tones("mission-complete", [(0.00, 64, .14), (.07, 69, .15), (.14, 71, .15), (.22, 76, .18)], .78, "pluck")

    for index, note in enumerate((72, 74, 76, 79), 1):
        tones(f"collectible-{index}", [(0.00, note, .10)], .14, "pluck", .012)
    tones("bonus-collectible", [(0.00, 76, .13), (.05, 83, .11)], .35, "sine")
    for index, note in enumerate((72, 76, 79), 1):
        tones(f"letter-{index}", [(0.00, note, .15)], .42, "pluck")
        tones(f"key-{index}", [(0.00, note - 12, .14), (.07, note, .12)], .45, "triangle", .02)
    tones("word-complete", [(0.00, 64, .15), (.07, 67, .15), (.14, 71, .16), (.22, 76, .19)], .82, "pluck")
    tones("chest-ready", [(0.00, 64, .12), (.09, 71, .14), (.18, 79, .13)], .72, "sine")
    tones("heart", [(0.00, 57, .14), (.13, 57, .18)], .58, "sine")
    tones("shield", [(0.00, 60, .12), (.04, 67, .12), (.08, 72, .12)], .72, "sine", .045)
    tones("boss-core", [(0.00, 48, .14), (.08, 60, .15), (.16, 72, .13)], .7, "triangle", .04)
    tones("reward-power", [(0.00, 72, .15), (.08, 79, .17), (.17, 84, .15)], .8, "sine")

    data = blank(1.05)
    add_noise(data, 0, .22, .13, 9, release=.2, decay=5)
    for at, note in ((.08, 55), (.17, 64), (.28, 71), (.42, 79)):
        add_bell(data, at, midi(note), .14, .58)
    write_wav("sfx/chest-open.wav", data)
    created.append("sfx/chest-open.wav")

    data = blank(.58)
    add_glide(data, 0, .28, 160, 82, .18, "sine", 7)
    add_noise(data, 0, .2, .07, 12)
    add_tone(data, .18, .28, midi(55), .10, "triangle", decay=7)
    write_wav("sfx/life-lost.wav", data)
    created.append("sfx/life-lost.wav")

    hazards = {
        "hazard-ice": (760, 1220, 11),
        "hazard-lava": (105, 64, 18),
        "hazard-rune": (310, 620, 7),
        "hazard-crystal": (920, 1680, 3),
    }
    for name, (f0, f1, smooth) in hazards.items():
        data = blank(.78)
        add_glide(data, 0, .5, f0, f1, .16, "sine", 3)
        add_noise(data, .02, .62, .10, smooth, release=.2, decay=3)
        write_wav(f"sfx/{name}.wav", data)
        created.append(f"sfx/{name}.wav")

    data = blank(.55)
    add_noise(data, 0, .5, .12, 18, release=.22, decay=2.5)
    add_glide(data, .02, .42, 740, 390, .10, "sine", 3)
    write_wav("sfx/ice-slide.wav", data)
    created.append("sfx/ice-slide.wav")

    data = blank(.66)
    for at in (0, .075, .15):
        add_tick(data, at, .12, wooden=True)
    add_glide(data, .18, .35, 380, 760, .12, "triangle", 4)
    write_wav("sfx/enemy-caught.wav", data)
    created.append("sfx/enemy-caught.wav")

    data = blank(.65)
    add_glide(data, 0, .3, 440, 620, .13, "triangle", 6)
    add_noise(data, .1, .42, .11, 10, decay=5)
    write_wav("sfx/enemy-defeated.wav", data)
    created.append("sfx/enemy-defeated.wav")

    return created


def make_character_pack(character: str, root_note: int, texture: str) -> list[str]:
    created = []
    recipes = {
        "select": [(0, root_note, .15), (.08, root_note + 7, .17)],
        "eat": [(0, root_note + 12, .15)],
        "correct": [(0, root_note + 4, .14), (.07, root_note + 9, .16)],
        "hit": [(0, root_note, .14), (.10, root_note - 3, .11)],
        "victory": [(0, root_note + 4, .14), (.08, root_note + 7, .15), (.16, root_note + 12, .18)],
        "idle": [(0, root_note, .08), (.09, root_note + 2, .07)],
    }
    for cue, notes in recipes.items():
        data = blank(.78 if cue == "victory" else .5)
        for at, note, gain in notes:
            add_glide(data, at, .24, midi(note), midi(note + (1.5 if character == "bifly" else -.8)), gain,
                      "sine", 6)
        if texture == "bubble":
            add_glide(data, .015, .18, 180, 760, .07, "sine", 8)
            add_noise(data, .01, .16, .025, 9)
        else:
            add_noise(data, .01, .28, .055, 19, release=.18, decay=5)
            add_tick(data, .025, .045, wooden=True)
        path = f"characters/{character}/{cue}.wav"
        write_wav(path, data)
        created.append(path)
    return created


def make_enemy_pack() -> list[str]:
    created = []
    for index, note in enumerate((42, 45, 48), 1):
        data = blank(.58)
        add_glide(data, 0, .36, midi(note), midi(note + 2), .11, "triangle", 4)
        add_noise(data, .02, .26, .025, 13)
        write_wav(f"enemies/idle-{index}.wav", data)
        created.append(f"enemies/idle-{index}.wav")
    data = blank(.48)
    add_glide(data, 0, .28, midi(45), midi(58), .15, "triangle", 5)
    write_wav("enemies/alert.wav", data)
    created.append("enemies/alert.wav")
    return created


def make_boss_pack(key: str, base_freq: float, material: str) -> list[str]:
    created = []
    configs = {
        "spawn": (1.25, base_freq * .72, base_freq * 1.35, .24),
        "move": (.48, base_freq, base_freq * .78, .13),
        "attack": (.92, base_freq * 1.15, base_freq * 2.1, .20),
        "hit": (.62, base_freq * 1.3, base_freq * .82, .18),
        "defeat": (1.35, base_freq, base_freq * .42, .22),
    }
    smooth = {"ice": 8, "rock": 24, "swamp": 18, "space": 5}[material]
    for cue, (duration, f0, f1, gain) in configs.items():
        data = blank(duration)
        add_glide(data, 0, duration * .62, f0, f1, gain, "sine" if material in ("ice", "space") else "triangle", 2.6)
        add_tone(data, .02, duration * .72, max(36, base_freq / 2), gain * .55, "sine", .01, .22, 2.4,
                 ((2.01, .28), (3.03, .12)))
        add_noise(data, .015, duration * .78, gain * (.55 if material != "ice" else .38), smooth, release=.25, decay=2.2)
        if material == "ice":
            for at in np.linspace(.12, duration * .65, 3):
                add_bell(data, float(at), base_freq * (2.4 + RNG.random()), .055, .38)
        elif material == "rock":
            for at in np.linspace(.08, duration * .55, 3):
                add_kick(data, float(at), .12)
        elif material == "swamp":
            for at in np.linspace(.1, duration * .58, 3):
                add_glide(data, float(at), .16, 90, 170, .055, "sine", 7)
        else:
            add_glide(data, duration * .12, duration * .58, base_freq * 4, base_freq * 1.2, .08, "sine", 2)
        path = f"bosses/{key}/{cue}.wav"
        write_wav(path, data, .78)
        created.append(path)
    return created


WORLD_SPECS = {
    # The background score deliberately stays below 92 BPM.  The old pack ran
    # at 96-112 BPM with a drum hit every half beat, which made a long practice
    # session feel hurried.  These four timbres keep the worlds recognisable
    # while sharing the same calm, major/pentatonic musical language.
    "ice": {"bpm": 84, "root": 62, "lead": "bell", "boss": "stage2"},
    "lava": {"bpm": 88, "root": 57, "lead": "wood", "boss": "stage1"},
    "ancient": {"bpm": 82, "root": 55, "lead": "pluck", "boss": "stage3"},
    "diamond": {"bpm": 90, "root": 64, "lead": "crystal", "boss": "stage4"},
}


# Diatonic I-V-vi-IV / I-IV-ii-V progression.  Keeping the chord quality in
# the recipe avoids the unrelated all-major chords that previously fought the
# melody in some bars.
GENTLE_PROGRESSION = (
    (0, (0, 4, 7)),
    (7, (0, 4, 7)),
    (9, (0, 3, 7)),
    (5, (0, 4, 7)),
    (0, (0, 4, 7)),
    (5, (0, 4, 7)),
    (2, (0, 3, 7)),
    (7, (0, 4, 7)),
)

GENTLE_MELODY = (
    (0, 2, 4),
    (7, 9),
    (9, 7, 4),
    (5, 4),
    (0, 4, 7),
    (5, 7),
    (2, 4, 5),
    (7, 4, 2),
)


def make_music_world(world: str, spec: dict) -> list[str]:
    beat = 60 / spec["bpm"]
    bars = 8
    duration = bars * 4 * beat
    root = spec["root"]
    base = blank(duration)
    pulse = blank(duration)
    melody = blank(duration)
    boss = blank(duration)

    for bar, ((offset, chord), phrase) in enumerate(zip(GENTLE_PROGRESSION, GENTLE_MELODY)):
        start = bar * 4 * beat
        chord_root = root + offset
        # Warm pad: long attacks and a quiet fundamental leave room for the
        # multiplication prompts and reward sounds.
        for interval in chord:
            add_tone(base, start, 4 * beat, midi(chord_root + interval - 12), .033,
                     "sine", .34, .48, .12, ((2, .10),))
        add_tone(base, start, 4 * beat, midi(chord_root - 24), .038,
                 "sine", .22, .52, .35)

        # Two soft accents per bar replace the previous eight-step drum loop.
        add_pluck(pulse, start + .15 * beat, midi(chord_root - 12), .035, beat * .72)
        add_pluck(pulse, start + 2.15 * beat, midi(chord_root - 5), .027, beat * .65)
        if world in ("ice", "diamond"):
            add_bell(pulse, start + 3.1 * beat, midi(root + 12), .018, beat * .62)

        # A short call or response with a full-beat gap between notes is much
        # less tiring than a constantly repeating four-note figure.
        spacing = 1.15 if len(phrase) == 3 else 1.6
        for idx, interval in enumerate(phrase):
            at = start + (.68 + idx * spacing) * beat
            note = midi(root + 12 + interval)
            if spec["lead"] in ("bell", "crystal"):
                add_bell(melody, at, note, .042, beat * 1.35)
            else:
                add_pluck(melody, at, note, .047, beat * 1.05)

        # Boss intensity remains available, but uses rounded low tones rather
        # than the old saw/noise layer.  Gameplay and boss event SFX are kept.
        add_tone(boss, start, 1.2 * beat, midi(root - 24), .064,
                 "triangle", .025, .24, 1.5)
        add_tone(boss, start + 2 * beat, 1.0 * beat, midi(root - 17), .048,
                 "triangle", .025, .22, 1.7)

    created = []
    for stem, data in (("base", base), ("pulse", pulse), ("melody", melody), ("boss", boss)):
        path = f"music/{world}-{stem}.wav"
        write_wav(path, data, .68 if stem == "base" else .62)
        created.append(path)
    return created


def make_menu_music() -> list[str]:
    bpm = 80
    beat = 60 / bpm
    duration = 8 * 4 * beat
    data = blank(duration)
    root = 60
    for bar, ((offset, chord), phrase) in enumerate(zip(GENTLE_PROGRESSION, GENTLE_MELODY)):
        start = bar * 4 * beat
        chord_root = root + offset
        for interval in chord:
            add_tone(data, start, 4 * beat, midi(chord_root + interval - 12), .038,
                     "sine", .38, .52, .10, ((2, .08),))
        add_tone(data, start, 4 * beat, midi(chord_root - 24), .035,
                 "sine", .25, .55, .3)
        spacing = 1.15 if len(phrase) == 3 else 1.6
        for idx, interval in enumerate(phrase):
            add_bell(data, start + (.72 + idx * spacing) * beat,
                     midi(root + 12 + interval), .035, beat * 1.4)
    write_wav("music/menu.wav", data, .58)
    return ["music/menu.wav"]


def make_stingers() -> list[str]:
    created = []
    recipes = {
        "world-transition": [(0, 60), (.12, 64), (.24, 65), (.38, 67)],
        "victory": [(0, 60), (.10, 64), (.20, 65), (.32, 67), (.48, 72), (.66, 76)],
        "new-record": [(0, 64), (.09, 67), (.18, 72), (.30, 76), (.44, 79), (.58, 84)],
        "game-over": [(0, 60), (.16, 57), (.34, 55), (.58, 60)],
    }
    for name, notes in recipes.items():
        duration = 1.7 if name in ("victory", "new-record") else 1.2
        data = blank(duration)
        for at, note in notes:
            add_bell(data, at, midi(note), .13 if name != "game-over" else .09, .7)
        if name in ("victory", "new-record"):
            for at in np.arange(0, .7, .14):
                add_tick(data, float(at), .04)
        write_wav(f"music/{name}.wav", data, .76)
        created.append(f"music/{name}.wav")
    return created


def main() -> None:
    files = []
    files += make_ui_sfx()
    files += make_character_pack("bifly", 67, "bubble")
    files += make_character_pack("nabatick", 57, "leaf")
    files += make_enemy_pack()
    files += make_boss_pack("stage1", 118, "rock")
    files += make_boss_pack("stage2", 172, "ice")
    files += make_boss_pack("stage3", 96, "swamp")
    files += make_boss_pack("stage4", 146, "space")
    files += make_menu_music()
    for world, spec in WORLD_SPECS.items():
        files += make_music_world(world, spec)
    files += make_stingers()
    manifest = {
        "version": 2,
        "sampleRate": SR,
        "license": "Original Kaflul procedural production audio; generated in-repository.",
        "fileCount": len(files),
        "files": files,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Generated {len(files)} original audio assets in {OUT}")


if __name__ == "__main__":
    main()
