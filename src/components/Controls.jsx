export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => v,
}) {
  return (
    <label className="slider">
      <span>{label}</span>
      <output>{format(value)}</output>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export function VoicePanel({ id, title, subtitle, value, onChange }) {
  const set = (key, v) => onChange({ ...value, [key]: v });
  return (
    <section className={"module voice " + id}>
      <div className="section-title">
        <span>{id === "bass" ? "01" : "02"}</span>
        <h2>{title}</h2>
        <button
          className={"mute " + (value.mute ? "selected" : "")}
          aria-pressed={value.mute}
          onClick={() => set("mute", !value.mute)}
        >
          {value.mute ? "Muted" : "Mute"}
        </button>
      </div>
      <p className="caption">{subtitle}</p>
      <div className="waves">
        {[
          ["sine", "∿"],
          ["triangle", "⋀"],
          ["sawtooth", "⩘"],
          ["square", "⊓"],
        ].map(([wave, icon]) => (
          <button
            key={wave}
            aria-pressed={value.wave === wave}
            className={value.wave === wave ? "selected" : ""}
            onClick={() => set("wave", wave)}
          >
            <b>{icon}</b>
            <small>{wave}</small>
          </button>
        ))}
      </div>
      <Slider
        label="Фильтр"
        value={value.filter}
        min={80}
        max={12000}
        step={10}
        onChange={(v) => set("filter", v)}
        format={(v) => (v >= 1000 ? (v / 1000).toFixed(1) + " kHz" : v + " Hz")}
      />
      <div className="pair">
        <Slider
          label="Атака"
          value={value.attack}
          min={0.005}
          max={1}
          step={0.005}
          onChange={(v) => set("attack", v)}
          format={(v) => v.toFixed(2) + " s"}
        />
        <Slider
          label="Затухание"
          value={value.release}
          min={0.05}
          max={3}
          step={0.05}
          onChange={(v) => set("release", v)}
          format={(v) => v.toFixed(2) + " s"}
        />
      </div>
      {id === "bass" ? (
        <Slider
          label="Дисторшн"
          value={value.effect}
          min={0}
          max={0.8}
          step={0.01}
          onChange={(v) => set("effect", v)}
          format={percent}
        />
      ) : (
        <div className="pair">
          <Slider
            label="Эхо"
            value={value.echo}
            min={0}
            max={0.7}
            step={0.01}
            onChange={(v) => set("echo", v)}
            format={percent}
          />
          <Slider
            label="Реверберация"
            value={value.reverb}
            min={0}
            max={0.7}
            step={0.01}
            onChange={(v) => set("reverb", v)}
            format={percent}
          />
        </div>
      )}
      <div className="chain">
        {id === "bass"
          ? "MONO → FILTER → DISTORTION → CH 01"
          : "POLY → FILTER → DELAY → REVERB → CH 02"}
      </div>
    </section>
  );
}
export const percent = (v) => Math.round(v * 100) + "%";
