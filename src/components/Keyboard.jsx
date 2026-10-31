import { useEffect, useRef, useState } from "react";
const shortcuts = [
  "KeyA",
  "KeyW",
  "KeyS",
  "KeyE",
  "KeyD",
  "KeyF",
  "KeyT",
  "KeyG",
  "KeyY",
  "KeyH",
  "KeyU",
  "KeyJ",
  "KeyK",
];
const names = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
  "C",
];
const tones = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
  "C",
];
const positions = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 };
export function Keyboard({ engine, ensureAudio, octave, onNote }) {
  const [active, setActive] = useState({});
  const pending = useRef(new Map());
  const down = async (id, i) => {
    if (pending.current.has(id)) return;
    pending.current.set(id, i);
    try {
      await ensureAudio();
      if (pending.current.get(id) !== i) return;
      const note = tones[i] + (octave + (i === 12 ? 1 : 0));
      engine.noteOn(id, note);
      setActive((s) => ({ ...s, [id]: i }));
      onNote(note);
    } catch {
      pending.current.delete(id);
    }
  };
  const up = (id) => {
    pending.current.delete(id);
    engine.noteOff(id);
    setActive((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  };
  useEffect(() => {
    const kd = (e) => {
      if (
        e.repeat ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(e.target.tagName)
      )
        return;
      const i = shortcuts.indexOf(e.code);
      if (i >= 0) {
        e.preventDefault();
        down(e.code, i);
      }
    };
    const ku = (e) => up(e.code);
    const clear = () => {
      pending.current.clear();
      engine.panic();
      setActive({});
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", clear);
    const vis = () => {
      if (document.hidden) clear();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", vis);
      clear();
    };
  }, [octave, ensureAudio]);
  return (
    <div className="keyboard">
      {names.map((name, i) => (
        <button
          key={i}
          aria-label={`${name}${octave + (i === 12 ? 1 : 0)}`}
          className={
            "key " +
            (positions[i] ? "black" : "white") +
            (Object.values(active).includes(i) ? " active" : "")
          }
          style={
            positions[i] ? { left: `${positions[i] * 12.5 - 3.7}%` } : undefined
          }
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            down("pointer" + e.pointerId, i);
          }}
          onPointerUp={(e) => up("pointer" + e.pointerId)}
          onPointerCancel={(e) => up("pointer" + e.pointerId)}
          onLostPointerCapture={(e) => up("pointer" + e.pointerId)}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              down("focus" + i, i);
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") up("focus" + i);
          }}
          onBlur={() => up("focus" + i)}
        >
          <span>{name}</span>
          <small>{shortcuts[i].slice(3)}</small>
        </button>
      ))}
    </div>
  );
}
