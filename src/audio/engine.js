import * as Tone from "tone";
import { demoMelody } from "../presets";
// Two independent voices, effect chains and stereo channels, joined at master.
export class SynthEngine {
  constructor() {
    this.ready = false;
    this.running = false;
    this.pattern = [];
    this.demo = false;
    this.step = 0;
    this.onStep = () => {};
    this.onError = () => {};
    this.held = new Map();
  }
  async init(settings, master) {
    await Tone.start();
    if (this.ready) return;
    this.master = new Tone.Gain(master).toDestination();
    this.limiter = new Tone.Limiter(-3).connect(this.master);
    this.waveform = new Tone.Waveform(512);
    this.master.connect(this.waveform);
    this.bassChannel = new Tone.Channel({
      volume: settings.bass.volume,
      pan: settings.bass.pan,
    }).connect(this.limiter);
    this.leadChannel = new Tone.Channel({
      volume: settings.lead.volume,
      pan: settings.lead.pan,
    }).connect(this.limiter);
    this.bassFilter = new Tone.Filter(650, "lowpass");
    this.distortion = new Tone.Distortion({
      distortion: 0.25,
      wet: 0.15,
      oversample: "2x",
    });
    this.bass = new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.65, release: 0.3 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.2,
        baseFrequency: 150,
        octaves: 1,
      },
    });
    this.bass.chain(this.bassFilter, this.distortion, this.bassChannel);
    this.leadFilter = new Tone.Filter(6500, "lowpass");
    this.delay = new Tone.FeedbackDelay({
      delayTime: "8n",
      feedback: 0.28,
      wet: 0.22,
    });
    this.reverb = new Tone.Reverb({ decay: 2, preDelay: 0.01, wet: 0.2 });
    await this.reverb.ready;
    this.lead = new Tone.PolySynth({
      voice: Tone.Synth,
      maxPolyphony: 16,
      options: {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.02, decay: 0.15, sustain: 0.7, release: 0.7 },
      },
    });
    this.lead.chain(this.leadFilter, this.delay, this.reverb, this.leadChannel);
    this.sequence = new Tone.Loop((time) => {
      const s = this.step % 16,
        n = this.pattern[s];
      if (n) this.bass.triggerAttackRelease(n, "16n", time, 0.75);
      if (this.demo && s % 2 === 0)
        this.lead.triggerAttackRelease(demoMelody[s / 2], "8n", time, 0.45);
      Tone.getDraw().schedule(() => this.onStep(s), time);
      this.step++;
    }, "16n");
    this.ready = true;
    this.apply("bass", settings.bass);
    this.apply("lead", settings.lead);
  }
  apply(id, v) {
    if (!this.ready) return;
    const synth = this[id],
      channel = this[id + "Channel"];
    synth.set({
      oscillator: { type: v.wave },
      envelope: { attack: v.attack, release: v.release },
    });
    channel.volume.rampTo(v.volume, 0.03);
    channel.pan.rampTo(v.pan, 0.03);
    channel.mute = v.mute;
    this[id + "Filter"].frequency.rampTo(v.filter, 0.03);
    if (id === "bass") this.distortion.wet.rampTo(v.effect, 0.03);
    else {
      this.delay.wet.rampTo(v.echo, 0.03);
      this.reverb.wet.rampTo(v.reverb, 0.03);
    }
  }
  setMaster(v) {
    if (this.ready) this.master.gain.rampTo(v, 0.03);
  }
  setTempo(bpm) {
    Tone.getTransport().bpm.rampTo(bpm, 0.05);
  }
  start(pattern, bpm) {
    if (!this.ready || this.running) return;
    this.pattern = pattern;
    this.step = 0;
    this.setTempo(bpm);
    this.sequence.start(0);
    Tone.getTransport().start("+0.05");
    this.running = true;
  }
  stop() {
    if (!this.ready) return;
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    this.sequence.stop();
    this.running = false;
    this.step = 0;
    this.panic();
    this.onStep(-1);
  }
  noteOn(id, note) {
    if (!this.ready || this.held.has(id)) return;
    if (![...this.held.values()].includes(note)) this.lead.triggerAttack(note);
    this.held.set(id, note);
  }
  noteOff(id) {
    const note = this.held.get(id);
    if (!note) return;
    this.held.delete(id);
    if (![...this.held.values()].includes(note)) this.lead.triggerRelease(note);
  }
  panic() {
    if (!this.ready) return;
    this.held.clear();
    this.lead.releaseAll();
    this.bass.triggerRelease();
  }
  dispose() {
    this.stop();
    for (const key of [
      "sequence",
      "bass",
      "lead",
      "bassFilter",
      "leadFilter",
      "distortion",
      "delay",
      "reverb",
      "bassChannel",
      "leadChannel",
      "waveform",
      "limiter",
      "master",
    ])
      this[key]?.dispose();
    this.ready = false;
  }
}
