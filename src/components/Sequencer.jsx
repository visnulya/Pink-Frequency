import { stepNotes } from "../presets";
export function Sequencer({ pattern, setPattern, step, running }) {
  return (
    <section className="module sequencer">
      <div className="section-title">
        <span>04</span>
        <h2>Velvet steps</h2>
        <span className="badge">16 STEP BASS SEQUENCER</span>
      </div>
      <p className="caption">
        Выбери ноты баса. «—» — пауза. Изменения слышны на следующем проходе
        шага.
      </p>
      <div className="steps">
        {pattern.map((note, i) => (
          <label
            key={i}
            className={
              "step " +
              (note ? "filled " : "") +
              (running && step === i ? "current" : "")
            }
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <select
              aria-label={"Нота шага " + (i + 1)}
              value={note ?? "—"}
              onChange={(e) =>
                setPattern(
                  pattern.map((v, j) =>
                    j === i
                      ? e.target.value === "—"
                        ? null
                        : e.target.value
                      : v,
                  ),
                )
              }
            >
              {stepNotes.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <i />
          </label>
        ))}
      </div>
    </section>
  );
}
