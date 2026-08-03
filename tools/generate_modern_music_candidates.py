#!/usr/bin/env python3
"""Generate original, modern soundtrack auditions for Kaflul.

These are arrangement auditions, not production assets.  Each clip follows the
same gameplay timeline so it can be judged against movement, collecting, a
question duck, a correct answer, a multi-ghost blast and a power-up.
"""

from __future__ import annotations

import json
import math
import subprocess
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "music-candidates-modern-2026"
SR = 44_100
DURATION = 52.0
N = int(SR * DURATION)
RNG = np.random.default_rng(260719)


NOTE = {
    "C2": 65.41, "D2": 73.42, "E2": 82.41, "F2": 87.31, "G2": 98.00, "A2": 110.00, "B2": 123.47,
    "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.00, "A3": 220.00, "B3": 246.94,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00, "A4": 440.00, "B4": 493.88,
    "C5": 523.25, "D5": 587.33, "E5": 659.25, "F5": 698.46, "G5": 783.99, "A5": 880.00, "B5": 987.77,
}


def stereo() -> np.ndarray:
    return np.zeros((N, 2), dtype=np.float64)


def env(n: int, attack=.012, decay=.12, sustain=.55, release=.18) -> np.ndarray:
    a = min(n, int(SR * attack)); d = min(max(0, n - a), int(SR * decay)); r = min(max(0, n - a - d), int(SR * release))
    s = max(0, n - a - d - r)
    parts = []
    if a: parts.append(np.linspace(0, 1, a, endpoint=False))
    if d: parts.append(np.linspace(1, sustain, d, endpoint=False))
    if s: parts.append(np.full(s, sustain))
    if r: parts.append(np.linspace(sustain, 0, r, endpoint=True))
    return np.concatenate(parts)[:n] if parts else np.zeros(n)


def pan_mono(x: np.ndarray, pan: float = 0.0) -> np.ndarray:
    angle = (pan + 1) * math.pi / 4
    return np.column_stack((x * math.cos(angle), x * math.sin(angle)))


def add(buf: np.ndarray, x: np.ndarray, at: float, gain=1.0, pan=0.0):
    i = int(at * SR)
    if x.ndim == 1: x = pan_mono(x, pan)
    n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i+n] += x[:n] * gain


def harmonic(freq: float, seconds: float, profile: str, velocity=.8, detune=0.0) -> np.ndarray:
    n = max(1, int(seconds * SR)); t = np.arange(n) / SR
    f = freq * 2 ** (detune / 1200)
    if profile == "soft_pluck":
        x = sum((1 / k**1.45) * np.sin(2*np.pi*f*k*t + .13*k) for k in range(1, 8))
        e = env(n, .004, .18, .12, max(.08, seconds*.28)) * np.exp(-t*2.0)
    elif profile == "guitar_pluck":
        x = sum(((-1)**k / k**1.2) * np.sin(2*np.pi*f*k*t + .27*k) for k in range(1, 11))
        e = env(n, .002, .09, .18, max(.08, seconds*.22)) * np.exp(-t*1.6)
    elif profile == "warm_keys":
        x = np.sin(2*np.pi*f*t) + .32*np.sin(2*np.pi*f*2*t) + .11*np.sin(2*np.pi*f*3*t)
        x += .08*np.sin(2*np.pi*(f*.501)*t)
        e = env(n, .018, .16, .62, .22)
    elif profile == "vocal":
        # Original vowel-like wavetable: formant-weighted partials, never sampled speech.
        x = sum(np.exp(-((k*f-850)/500)**2) * np.sin(2*np.pi*f*k*t + k*.21) for k in range(1, 13))
        x += .55 * sum(np.exp(-((k*f-1900)/700)**2) * np.sin(2*np.pi*f*k*t + k*.37) for k in range(1, 13))
        e = env(n, .018, .08, .48, .14)
    elif profile == "wide_synth":
        x = sum(np.sin(2*np.pi*f*(1+c)*t + p) for c,p in [(-.006,0),(-.002,1.1),(0,.4),(.003,2.1),(.007,.9)]) / 5
        x += .22*np.sin(2*np.pi*f*2*t)
        e = env(n, .035, .18, .72, .28)
    else:
        x = np.sin(2*np.pi*f*t); e = env(n)
    return np.tanh(x * .8) * e * velocity


def chord(buf, notes, at, seconds, profile="warm_keys", gain=.25, width=.55):
    for idx, name in enumerate(notes):
        pan = np.linspace(-width, width, len(notes))[idx]
        add(buf, harmonic(NOTE[name], seconds, profile, .75, -3 if idx % 2 else 3), at, gain/len(notes)**.45, pan)


def bass(buf, name, at, seconds, gain=.34, log=False):
    f = NOTE[name]; n = int(seconds*SR); t = np.arange(n)/SR
    if log:
        pitch = f * (1 + 1.7*np.exp(-t*22))
        phase = 2*np.pi*np.cumsum(pitch)/SR
        x = np.sin(phase) + .24*np.sin(phase*2)
        e = env(n, .002, .18, .08, .12) * np.exp(-t*.65)
    else:
        x = np.sin(2*np.pi*f*t) + .20*np.sin(2*np.pi*f*2*t) + .07*np.sin(2*np.pi*f*3*t)
        e = env(n, .008, .14, .68, .12)
    add(buf, np.tanh(x*1.15)*e, at, gain)


def kick(seconds=.44):
    n=int(seconds*SR); t=np.arange(n)/SR
    freq=48 + 120*np.exp(-t*30); phase=2*np.pi*np.cumsum(freq)/SR
    body=np.sin(phase)*np.exp(-t*10.5)
    click=RNG.normal(0,1,n)*np.exp(-t*95)*.10
    return np.tanh((body+click)*1.5)


def snare(seconds=.30, clap=False):
    n=int(seconds*SR); t=np.arange(n)/SR
    noise=RNG.normal(0,1,n); hp=np.concatenate(([noise[0]],np.diff(noise)))
    tone=np.sin(2*np.pi*185*t)*np.exp(-t*18)*.26
    if clap:
        e=sum(np.exp(-np.maximum(0,t-x)*38)*(t>=x) for x in [0,.018,.037,.075])
    else: e=np.exp(-t*14)
    return np.tanh((hp*.27*e+tone)*1.25)


def hat(seconds=.075, open_hat=False):
    n=int(seconds*SR); t=np.arange(n)/SR; z=RNG.normal(0,1,n); hp=np.concatenate(([z[0]],np.diff(z)))
    return np.tanh(hp*.22) * np.exp(-t*(18 if open_hat else 62))


def shaker(seconds=.12):
    n=int(seconds*SR); t=np.arange(n)/SR; z=RNG.normal(0,1,n); hp=np.concatenate(([z[0]],np.diff(z)))
    return hp*.13*np.sin(np.pi*np.minimum(1,t/.018))*np.exp(-t*26)


def riser(seconds=1.0):
    n=int(seconds*SR); t=np.arange(n)/SR; z=RNG.normal(0,1,n); hp=np.concatenate(([z[0]],np.diff(z)))
    e=(t/seconds)**1.8
    sweep=np.sin(2*np.pi*(180*t+700*t*t/seconds))
    return np.tanh((hp*.11+sweep*.11)*e)


def impact(seconds=.8):
    n=int(seconds*SR); t=np.arange(n)/SR
    x=np.sin(2*np.pi*(54*t+18*np.exp(-t*15))) * np.exp(-t*5)
    z=RNG.normal(0,1,n)*np.exp(-t*10)*.14
    return np.tanh((x+z)*1.6)


def add_delay(buf, seconds=.23, feedback=.18):
    d=int(seconds*SR)
    dry=buf.copy()
    if d < len(buf):
        buf[d:,0] += dry[:-d,1]*feedback
        buf[d:,1] += dry[:-d,0]*feedback
    if 2*d < len(buf): buf[2*d:] += dry[:-2*d]*feedback*.35


def question_duck(buf):
    # 24–29 s: leave rhythm audible but move it behind the arithmetic UI.
    a,b=int(23.6*SR),int(29.2*SR); fade=int(.32*SR)
    g=np.full(b-a,.30)
    g[:fade]=np.linspace(1,.30,fade); g[-fade:]=np.linspace(.30,1,fade)
    buf[a:b] *= g[:,None]


def master(buf):
    # Gentle bus compression/soft clipping and a short safety fade.
    buf=np.tanh(buf*1.12)
    peak=np.max(np.abs(buf)); buf *= .91/max(peak,1e-8)
    f=int(.018*SR); buf[:f] *= np.linspace(0,1,f)[:,None]; buf[-f:] *= np.linspace(1,0,f)[:,None]
    return buf


def drums(buf, bpm, style):
    beat=60/bpm; total=int(DURATION/beat)
    for i in range(total):
        t=i*beat
        bar=i%4
        if style in ("pop","future"):
            if bar in (0,2) or (style=="pop" and bar==3 and i%8==7): add(buf,kick(),t,.78)
            if bar in (1,3): add(buf,snare(clap=True),t,.54)
            for sub in (0,.5): add(buf,hat(),t+sub*beat,.22,(-.25 if sub==0 else .25))
        elif style=="afro":
            if bar==0: add(buf,kick(),t,.73)
            if bar==2: add(buf,kick(),t+.20*beat,.55)
            if bar in (1,3): add(buf,snare(clap=True),t,.43)
            for sub in (0,.25,.5,.75): add(buf,shaker(),t+sub*beat,.23, math.sin(i+sub)*.42)
        elif style=="rock":
            if bar in (0,2): add(buf,kick(),t,.84)
            if bar in (1,3): add(buf,snare(),t,.66)
            for sub in (0,.5): add(buf,hat(.10,sub==.5),t+sub*beat,.25)


def arrange(spec):
    buf=stereo(); bpm=spec["bpm"]; beat=60/bpm; bar=beat*4
    drums(buf,bpm,spec["drums"])
    progression=spec["progression"]
    bass_roots=spec["bass"]
    for bi, at in enumerate(np.arange(0,DURATION,bar)):
        notes=progression[bi%len(progression)]
        # Start airy, add the main hook after 8 s, widen after blast/power.
        section_gain=.16 if at<8 else (.24 if at<31 else .31)
        chord(buf,notes,float(at),bar*.92,spec["chord"],section_gain,.45 if at<31 else .78)
        root=bass_roots[bi%len(bass_roots)]
        if spec["drums"]=="afro":
            for off in (0,1.5,2.5,3.25): bass(buf,root,float(at+off*beat),beat*.70,.34,True)
        else:
            for q in range(4): bass(buf,root,float(at+q*beat),beat*.78,.28 if at<31 else .36)
        if at>=8:
            motif=spec["motif"]
            pattern=[0,.75,1.5,2.5,3.0]
            for k,off in enumerate(pattern):
                name=motif[(bi*2+k)%len(motif)]
                profile="vocal" if spec["hook"]=="vocal" and k in (1,4) else spec["hook"]
                add(buf,harmonic(NOTE[name],beat*.55,profile,.66),float(at+off*beat),spec["hook_gain"],(-.42+.21*k))

    # Musical punctuation matched to Kaflul's real event rhythm.
    for t in [8.2,10.15,12.1,16.05,18.0]:
        add(buf,harmonic(NOTE[spec["sparkle"]],.18,"vocal",.72),t,.19,.35)
    add(buf,riser(1.6),29.3,.36)
    add(buf,impact(),31.0,.66)
    chord(buf,spec["power_chord"],31.0,2.4,"wide_synth",.38,.85)
    for t in [31.0,31.16,31.32]: add(buf,harmonic(NOTE[spec["sparkle"]],.25,"vocal",.72),t,.20,(t-31.16)*4)
    add(buf,riser(.75),39.15,.27)
    add(buf,impact(.62),39.9,.46)
    chord(buf,spec["power_chord"],39.9,3.0,"wide_synth",.34,.88)
    question_duck(buf)
    add_delay(buf,.19 if spec["drums"]!="afro" else .27,.13)
    return master(buf)


SPECS=[
 {"id":"01","slug":"glossy-pop-adventure","title":"פופ הרפתקה מבריק","bpm":120,"drums":"pop","chord":"warm_keys","hook":"vocal","hook_gain":.19,
  "progression":[["C4","E4","G4"],["G3","B3","D4"],["A3","C4","E4"],["F3","A3","C4"]],"bass":["C2","G2","A2","F2"],"motif":["E5","G5","A5","G5","D5"],"sparkle":"G5","power_chord":["C4","E4","G4","C5"],
  "caption":"פופ־דאנס עכשווי ושמח: תופים נקיים, בס עגול והוק קולי ללא מילים. הכי קרוב לעולם של Just Dance/K-pop בלי להפוך לשיר שמפריע לחשבון."},
 {"id":"02","slug":"afropop-playground","title":"אפרו־פופ משחקי","bpm":110,"drums":"afro","chord":"soft_pluck","hook":"soft_pluck","hook_gain":.23,
  "progression":[["A3","C4","E4"],["F3","A3","C4"],["C4","E4","G4"],["G3","B3","D4"]],"bass":["A2","F2","C2","G2"],"motif":["E5","C5","A4","C5","G5"],"sparkle":"A5","power_chord":["A3","C4","E4","A4"],
  "caption":"אפרו־פופ קליל ומודרני: שייקרים, קצב מקפיץ ובס log רך. פחות עמוס ופחות מתיש לאורך שלב ארוך, אבל עדיין מרגיש חדש ורוקד."},
 {"id":"03","slug":"hero-pop-rock","title":"פופ־רוק גיבורי","bpm":122,"drums":"rock","chord":"guitar_pluck","hook":"guitar_pluck","hook_gain":.21,
  "progression":[["D4","F4","A4"],["B3","D4","F4"],["F3","A3","C4"],["C4","E4","G4"]],"bass":["D2","B2","F2","C2"],"motif":["A4","C5","D5","F5","E5"],"sparkle":"A5","power_chord":["D4","F4","A4","D5"],
  "caption":"פופ־רוק של גיבורי אנימציה: תופים חזקים, פריטות ובס קדמי. נותן לפיצוץ הרוחות תחושת הישג ואקשן בלי צלילי ארקייד ישנים."},
 {"id":"04","slug":"future-bubble-power","title":"באבל־פופ עתידני","bpm":128,"drums":"future","chord":"wide_synth","hook":"vocal","hook_gain":.18,
  "progression":[["F3","A3","C4"],["A3","C4","E4"],["C4","E4","G4"],["G3","B3","D4"]],"bass":["F2","A2","C2","G2"],"motif":["C5","E5","G5","E5","D5"],"sparkle":"C5","power_chord":["F3","A3","C4","F4"],
  "caption":"Future/Bubble Pop רחב: אקורדים נוצצים, דרופ קצר ואנרגיית כוח. האפשרות הכי צבעונית ועוצמתית לפיצוצים ולבונוסים."},
]


def write_wav(path, audio):
    pcm=(np.clip(audio,-1,1)*32767).astype("<i2")
    with wave.open(str(path),"wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def main():
    OUT.mkdir(parents=True,exist_ok=True); manifest=[]
    for spec in SPECS:
        wav=OUT/f"{spec['id']}-{spec['slug']}.wav"; m4a=wav.with_suffix(".m4a")
        audio=arrange(spec); write_wav(wav,audio)
        subprocess.run(["afconvert",str(wav),"-o",str(m4a),"-f","m4af","-d","aac@44100","-c","2","-b","128000","-q","96"],check=True)
        rms=float(np.sqrt(np.mean(audio**2))); peak=float(np.max(np.abs(audio)))
        manifest.append({**spec,"wav":str(wav.relative_to(ROOT)),"m4a":str(m4a.relative_to(ROOT)),"duration":DURATION,"rms_dbfs":round(20*math.log10(max(rms,1e-9)),2),"peak_dbfs":round(20*math.log10(max(peak,1e-9)),2)})
        print(f"{spec['id']} {spec['title']}: {m4a} ({rms:.4f} RMS)")
    (OUT/"candidates.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


if __name__=="__main__": main()
