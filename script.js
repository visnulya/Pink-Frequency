'use strict'
// Учебный полифонический синтезатор: Web Audio API, без внешних зависимостей.
const $ = id => document.getElementById(id)
const settings = { wave: 'sine', octave: 4, volume: .35, filter: 8000, attack: .02, release: .4, echo: .2 }
const voices = new Map()
const physicalKeys = new Set()
let audio, master, filter, delay, feedback, wet, analyser, enabled = false
const notes = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B', 'C']
const shortcuts = ['a','w','s','e','d','f','t','g','y','h','u','j','k']
const whitePositions = [0, null, 1, null, 2, 3, null, 4, null, 5, null, 6, 7]
notes.forEach((note, index) => {
  const key = document.createElement('button')
  key.className = 'key ' + (whitePositions[index] === null ? 'black' : 'white')
  key.innerHTML = `${note}<small>${shortcuts[index].toUpperCase()}</small>`
  key.setAttribute('aria-label', `Нота ${note}`)
  key.dataset.index = index
  if (whitePositions[index] === null) {
    const previous = whitePositions[index - 1]
    key.style.left = `${(previous + 1) * 12.5 - 3.6}%`
  }
  key.addEventListener('pointerdown', async event => {
    event.preventDefault()
    key.setPointerCapture(event.pointerId)
    const id = `p${event.pointerId}`
    physicalKeys.add(id)
    await activate()
    if (physicalKeys.has(id)) play(id, index)
  })
  const release = event => { const id = `p${event.pointerId}`; physicalKeys.delete(id); stop(id) }
  key.addEventListener('pointerup', release)
  key.addEventListener('pointercancel', release)
  key.addEventListener('lostpointercapture', release)
  // Клавиатурная активация кнопок для экранных дикторов.
  key.addEventListener('click', async event => {
    if (event.detail === 0) { await activate(); const id = `accessible${index}`; play(id, index); setTimeout(() => stop(id), 300) }
  })
  $('keyboard').append(key)
})
async function activate() {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)()
    master = audio.createGain(); master.gain.value = settings.volume * .22
    filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = settings.filter
    delay = audio.createDelay(1); delay.delayTime.value = .28
    feedback = audio.createGain(); feedback.gain.value = .3
    wet = audio.createGain(); wet.gain.value = settings.echo
    analyser = audio.createAnalyser(); analyser.fftSize = 2048
    filter.connect(master); filter.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(wet); wet.connect(master)
    master.connect(analyser); analyser.connect(audio.destination)
    draw()
  }
  await audio.resume()
  enabled = true; $('power').textContent = 'Звук включён ♡'; $('power').setAttribute('aria-pressed', 'true')
  $('status').textContent = 'Играй мышью или клавишами A–K'
}
function play(id, index) {
  if (!enabled || voices.has(id)) return
  const midi = (settings.octave + 1) * 12 + index
  const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime
  oscillator.type = settings.wave; oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
  gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(1, now + settings.attack)
  oscillator.connect(gain); gain.connect(filter); oscillator.start()
  voices.set(id, { oscillator, gain, index })
  document.querySelector(`[data-index="${index}"]`).classList.add('active')
  $('note').textContent = `${notes[index]}${settings.octave + (index === 12 ? 1 : 0)} · ${settings.wave.toUpperCase()}`
}
function stop(id, immediate = false) {
  const voice = voices.get(id); if (!voice) return
  const now = audio.currentTime, duration = immediate ? .015 : settings.release
  voice.gain.gain.cancelAndHoldAtTime(now)
  voice.gain.gain.linearRampToValueAtTime(0, now + duration)
  voice.oscillator.stop(now + duration + .02)
  voice.oscillator.onended = () => { voice.oscillator.disconnect(); voice.gain.disconnect() }
  voices.delete(id)
  if (![...voices.values()].some(v => v.index === voice.index)) document.querySelector(`[data-index="${voice.index}"]`).classList.remove('active')
  if (!voices.size) $('note').textContent = 'READY TO DREAM'
}
function stopAll() {
  physicalKeys.clear(); [...voices.keys()].forEach(id => stop(id, true))
  if (wet) { wet.gain.setValueAtTime(0, audio.currentTime); wet.gain.setValueAtTime(settings.echo, audio.currentTime + .03) }
}
$('power').addEventListener('click', async () => {
  if (enabled) { stopAll(); await audio.suspend(); enabled = false; $('power').textContent = 'Включить звук ↗'; $('power').setAttribute('aria-pressed', 'false'); $('status').textContent = 'Звук выключен' }
  else { try { await activate() } catch (error) { $('status').textContent = 'Не удалось включить звук. Попробуй Chrome или Firefox.'; console.error(error) } }
})
$('panic').addEventListener('click', stopAll)
document.querySelectorAll('[data-wave]').forEach(button => button.addEventListener('click', () => setWave(button.dataset.wave)))
function setWave(wave) { settings.wave = wave; document.querySelectorAll('[data-wave]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wave === wave))); voices.forEach(v => v.oscillator.type = wave) }
function update(name) {
  const value = Number($(name).value)
  settings[name] = name === 'filter' ? Math.round(80 * Math.pow(100, value / 80)) : ['volume','echo'].includes(name) ? value / 100 : value
  $(name + 'Value').textContent = name === 'filter' ? `${settings.filter} Hz` : ['volume','echo'].includes(name) ? `${value}%` : `${value.toFixed(2)} s`
  if (!audio) return
  if (name === 'volume') master.gain.setTargetAtTime(settings.volume * .22, audio.currentTime, .02)
  if (name === 'filter') filter.frequency.setTargetAtTime(Math.min(settings.filter, audio.sampleRate / 2 - 1), audio.currentTime, .02)
  if (name === 'echo') wet.gain.setTargetAtTime(settings.echo, audio.currentTime, .02)
}
;['volume','filter','attack','release','echo'].forEach(name => $(name).addEventListener('input', () => update(name)))
function octave(delta) { stopAll(); settings.octave = Math.max(2, Math.min(6, settings.octave + delta)); $('octave').textContent = settings.octave }
$('octDown').addEventListener('click', () => octave(-1)); $('octUp').addEventListener('click', () => octave(1))
const presets = { dream: { wave: 'sine', filter: 80, attack: .15, release: 1.2, echo: 35 }, gloss: { wave: 'sawtooth', filter: 65, attack: .01, release: .2, echo: 15 }, velvet: { wave: 'triangle', filter: 45, attack: .3, release: 1.7, echo: 25 } }
document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => { const preset = presets[b.dataset.preset]; setWave(preset.wave); Object.entries(preset).forEach(([name,value]) => { if (name !== 'wave') { $(name).value = value; update(name) } }); $('status').textContent = `Настроение: ${b.textContent.trim()}` }))
document.addEventListener('keydown', async event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || ['INPUT','BUTTON','TEXTAREA','SELECT'].includes(event.target.tagName)) return
  const index = shortcuts.indexOf(event.code.replace('Key','').toLowerCase()); if (index < 0) return
  event.preventDefault(); const id = event.code; physicalKeys.add(id); await activate(); if (physicalKeys.has(id)) play(id, index)
})
document.addEventListener('keyup', event => { physicalKeys.delete(event.code); stop(event.code) })
window.addEventListener('blur', stopAll)
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll() })
function draw() {
  const canvas = $('scope'), context = canvas.getContext('2d'), data = new Uint8Array(analyser.fftSize)
  function frame() { requestAnimationFrame(frame); analyser.getByteTimeDomainData(data); context.clearRect(0,0,480,110); context.strokeStyle = '#ff93c4'; context.lineWidth = 2; context.beginPath(); for (let i=0;i<data.length;i++) { const x = i/data.length*480, y = data[i]/128*55; i ? context.lineTo(x,y) : context.moveTo(x,y) } context.stroke() }
  frame()
}
