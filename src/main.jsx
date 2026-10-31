import React, { useState, useRef, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { SynthEngine } from "./audio/engine";
import { Slider, VoicePanel, percent } from "./components/Controls";
import { Keyboard } from "./components/Keyboard";
import { Sequencer } from "./components/Sequencer";
import { initialVoices, moods, defaultPattern } from "./presets";
import "./style.css";
function App() {
  const engine = useRef(new SynthEngine()).current,
    initPromise = useRef(null);
  const [voices, setVoices] = useState(() => structuredClone(initialVoices)),
    [master, setMaster] = useState(0.7),
    [tempo, setTempo] = useState(112),
    [octave, setOctave] = useState(4),
    [pattern, setPattern] = useState([...defaultPattern]),
    [running, setRunning] = useState(false),
    [step, setStep] = useState(-1),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState("READY TO DREAM"),
    [error, setError] = useState(""),
    [mood, setMood] = useState("Dream"),
    [demo, setDemo] = useState(false);
  const settingsRef = useRef({ voices, master });
  settingsRef.current = { voices, master };
  const canvas = useRef(null);
  const ensureAudio = useCallback(async () => {
    if (engine.ready) {
      await engine.init(settingsRef.current.voices, settingsRef.current.master);
      return;
    }
    if (!initPromise.current) {
      setBusy(true);
      initPromise.current = engine
        .init(settingsRef.current.voices, settingsRef.current.master)
        .then(() => {
          setReady(true);
          setError("");
        })
        .catch((e) => {
          setError("Не удалось включить звук: " + e.message);
          initPromise.current = null;
          throw e;
        })
        .finally(() => setBusy(false));
    }
    await initPromise.current;
  }, [engine]);
  useEffect(() => {
    engine.onStep = setStep;
    return () => engine.dispose();
  }, [engine]);
  useEffect(() => {
    engine.apply("bass", voices.bass);
    engine.apply("lead", voices.lead);
  }, [voices, ready]);
  useEffect(() => engine.setMaster(master), [master, ready]);
  useEffect(() => {
    if (ready) engine.setTempo(tempo);
  }, [tempo, ready]);
  useEffect(() => {
    engine.pattern = pattern;
  }, [pattern]);
  useEffect(() => {
    engine.demo = demo;
  }, [demo]);
  useEffect(() => {
    let frame;
    const ctx = canvas.current.getContext("2d");
    const draw = () => {
      frame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, 600, 100);
      ctx.strokeStyle = "#ffacd1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const data = engine.ready
        ? engine.waveform.getValue()
        : new Float32Array(512);
      data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * 600,
          y = 50 - v * 100;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [engine]);
  async function toggle() {
    try {
      await ensureAudio();
      if (engine.running) {
        engine.stop();
        setRunning(false);
      } else {
        engine.start(pattern, tempo);
        setRunning(true);
      }
    } catch {}
  }
  function stop() {
    engine.stop();
    setRunning(false);
    setNote("READY TO DREAM");
  }
  function changeVoice(id, value) {
    setVoices((s) => ({ ...s, [id]: value }));
    setMood("Custom");
  }
  function preset(name) {
    setVoices(structuredClone(moods[name]));
    setMood(name);
  }
  return (
    <main className="studio">
      <header>
        <div className="eyebrow">
          <span>YOUR DREAM SOUND STUDIO</span>
          <span>VOL. 02 ✧</span>
        </div>
        <h1>
          Pink <i>Frequency</i>
          <sup>✦</sup>
        </h1>
        <p>Два голоса. Один ритм. Твоё настроение.</p>
      </header>
      <div className="instrument">
        <div className="topline">
          <span className="brand">PF / DREAM MACHINE</span>
          <div className="moods">
            {Object.keys(moods).map((n) => (
              <button
                key={n}
                className={mood === n ? "selected" : ""}
                onClick={() => preset(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            className="power"
            disabled={busy}
            onClick={() => ensureAudio().catch(() => {})}
          >
            {busy
              ? "Подключаем…"
              : ready
                ? "● Звук включён"
                : "Включить звук ↗"}
          </button>
        </div>
        <div className="display">
          <div>
            <span className="micro">NOW PLAYING · {mood.toUpperCase()}</span>
            <strong>{note}</strong>
            <span>
              {running
                ? `VELVET SEQUENCE · STEP ${String(step + 1).padStart(2, "0")} / 16`
                : "Запусти бас и сыграй свою мелодию"}
            </span>
          </div>
          <canvas
            ref={canvas}
            width="600"
            height="100"
            aria-label="Звуковая волна"
          />
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="transport">
          <div className="transport-buttons">
            <button
              className={"play " + (running ? "selected" : "")}
              disabled={busy}
              onClick={toggle}
            >
              {running ? "■ Остановить" : "▶ Играть"}
            </button>
            <button onClick={stop}>■ Стоп</button>
          </div>
          <label className="tempo">
            TEMPO{" "}
            <input
              aria-label="Темп BPM"
              type="number"
              min="60"
              max="180"
              value={tempo}
              onChange={(e) =>
                setTempo(
                  Math.max(60, Math.min(180, Number(e.target.value) || 60)),
                )
              }
            />{" "}
            BPM
          </label>
          <label className="demo">
            <input
              type="checkbox"
              checked={demo}
              onChange={(e) => setDemo(e.target.checked)}
            />{" "}
            Демо-мелодия
          </label>
          <button
            className="panic"
            onClick={() => {
              engine.panic();
              setNote("READY TO DREAM");
            }}
          >
            Снять ноты
          </button>
        </div>
        <div className="rack">
          <VoicePanel
            id="bass"
            title="Velvet Bass"
            subtitle="Плотный монофонический бас · секвенсор"
            value={voices.bass}
            onChange={(v) => changeVoice("bass", v)}
          />
          <VoicePanel
            id="lead"
            title="Gloss Lead"
            subtitle="Мелодии и аккорды · клавиши A–K"
            value={voices.lead}
            onChange={(v) => changeVoice("lead", v)}
          />
          <section className="module mixer">
            <div className="section-title">
              <span>03</span>
              <h2>Pink Mixer</h2>
            </div>
            {["bass", "lead"].map((id) => (
              <div className="channel" key={id}>
                <h3>{id === "bass" ? "CH 01 / VELVET" : "CH 02 / GLOSS"}</h3>
                <Slider
                  label={"Громкость " + (id === "bass" ? "баса" : "мелодии")}
                  value={voices[id].volume}
                  min={-36}
                  max={0}
                  onChange={(v) =>
                    changeVoice(id, { ...voices[id], volume: v })
                  }
                  format={(v) => v + " dB"}
                />
                <Slider
                  label={"Панорама " + (id === "bass" ? "баса" : "мелодии")}
                  value={voices[id].pan}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(v) => changeVoice(id, { ...voices[id], pan: v })}
                  format={(v) =>
                    v === 0
                      ? "CENTER"
                      : (v < 0 ? "L " : "R ") + Math.round(Math.abs(v) * 100)
                  }
                />
              </div>
            ))}
            <Slider
              label="Общая громкость"
              value={master}
              min={0}
              max={1}
              step={0.01}
              onChange={setMaster}
              format={percent}
            />
            <p className="limiter">STEREO OUT · LIMITER −3 dB</p>
          </section>
        </div>
        <Sequencer
          pattern={pattern}
          setPattern={setPattern}
          step={step}
          running={running}
        />
        <div className="keyboard-header">
          <div>
            <strong>GLOSS LEAD / PLAY SOMETHING PRETTY</strong>
            <span>Мышь · касание · клавиши A–K</span>
          </div>
          <div className="octave">
            <span>Октава</span>
            <button
              aria-label="Октава ниже"
              onClick={() => setOctave((v) => Math.max(2, v - 1))}
            >
              −
            </button>
            <b>{octave}</b>
            <button
              aria-label="Октава выше"
              onClick={() => setOctave((v) => Math.min(6, v + 1))}
            >
              +
            </button>
          </div>
        </div>
        <Keyboard
          engine={engine}
          ensureAudio={ensureAudio}
          octave={octave}
          onNote={setNote}
        />
        <footer>
          <span>♡ MADE FOR YOUR MAIN CHARACTER MOMENT</span>
          <span>REACT + TONE.JS · TWO VOICES / STEREO</span>
        </footer>
      </div>
      <details>
        <summary>Как сыграть первый сет</summary>
        <p>
          Нажми «Играть»: запустится басовый рисунок. Играй мелодию клавишами A
          W S E D F T G Y H U J K (работает и в русской раскладке). Нажми на
          заголовок, если перед этим меняла бегунок. Для готового примера включи
          «Демо-мелодия». Меняй фильтры, эффекты, пресеты и Mute. «Стоп»
          возвращает рисунок в начало; хвосты эффектов плавно затихают.
        </p>
      </details>
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
