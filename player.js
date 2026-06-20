class Waveform {
  constructor(id) {
    this.id = id
    this.context = this._createContext()
    this.source = null
    this.buffer = null
    this.imageInfo = null
    this.trackInfo = null
    this._svgDoc = null
    this._waveSpiral = null
    this._playbackHead = null
    this._pauseButton = null
    this.pauseState = 'reset'
    this.startedAt = 0
    this.trackPosition = 0
    this._rafId = null
    this.onEnded = () => {}
    this._setupFx()
    this._setupControls()
  }

  _createContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) {
      alert('Web Audio API not supported. Please use a modern browser.')
      return null
    }
    return new Ctx()
  }

  _setupFx() {
    const ctx = this.context

    // Volume + lowpass filter chain → output
    this.gainNode = ctx.createGain()
    this.lopass = ctx.createBiquadFilter()
    this.lopass.type = 'lowpass'
    this.lopass.Q.value = 10
    this.lopass.frequency.value = 20000
    this.lopass.connect(this.gainNode)
    this.gainNode.connect(ctx.destination)

    // Delay: send → lopass → delay → feedback → hipass → compressor → (loops) → output
    this.delaySend = ctx.createGain()
    this.delaySend.gain.value = 0
    this.delayLine = ctx.createDelay(1.5)
    this.delayLine.delayTime.value = 0.35
    this.delayFeedback = ctx.createGain()
    this.delayFeedback.gain.value = 0.4
    this.delayLopass = ctx.createBiquadFilter()
    this.delayLopass.type = 'lowpass'
    this.delayLopass.frequency.value = 2000
    this.delayHipass = ctx.createBiquadFilter()
    this.delayHipass.type = 'highpass'
    this.delayHipass.frequency.value = 150
    this.delayComp = ctx.createDynamicsCompressor()
    this.delayComp.threshold.value = -30
    this.delayComp.knee.value = 40
    this.delayComp.ratio.value = 4
    this.delayComp.attack.value = 0.015
    this.delayComp.release.value = 0.078

    this.delaySend.connect(this.delayLopass)
    this.delayLopass.connect(this.delayLine)
    this.delayLine.connect(this.delayFeedback)
    this.delayFeedback.connect(this.delayHipass)
    this.delayHipass.connect(this.delayComp)
    this.delayComp.connect(this.delayLopass)
    this.delayLine.connect(ctx.destination)
  }

  _setupControls() {
    const bind = (id, fn) => {
      const el = document.getElementById(id)
      if (el) el.addEventListener('input', fn)
    }
    bind('volume',         e => { this.gainNode.gain.value                = +e.target.value })
    bind('filter',         e => {
      const min = Math.log(100), max = Math.log(20000)
      this.lopass.frequency.value = Math.exp(+e.target.value * (max - min) + min)
    })
    bind('delay-time',     e => { this.delayLine.delayTime.value          = +e.target.value })
    bind('delay-feedback', e => { this.delayFeedback.gain.value           = +e.target.value })
    bind('delay-send',     e => { this.delaySend.gain.value               = +e.target.value })
  }

  run(trackInfo, cb) {
    this.trackInfo = trackInfo
    this._clear()
    this._stop()
    this._createHtml(trackInfo)

    fetch('json/' + trackInfo.svgId + '.json')
      .then(r => r.json())
      .then(data => {
        this.imageInfo = data
        const obj = document.getElementById('svg-' + this.id)
        obj.addEventListener('load', () => {
          this._svgDoc = obj.contentDocument
          this._waveSpiral   = this._svgDoc.querySelector('#sp')
          this._playbackHead = this._svgDoc.querySelector('#playback-head')
          this._pauseButton  = this._svgDoc.querySelector('#pausebutton')
          // CSS transform-origin for SVG rotation must be set explicitly
          if (this._waveSpiral) {
            const c = this.imageInfo.size * 0.5 + 'px'
            this._waveSpiral.style.transformOrigin = `${c} ${c}`
          }
          this._pauseButton.addEventListener('click', () => this._pauseClick())
          this.pauseState = 'reset'
          this._loadAudio(cb)
        })
      })
  }

  _clear() {
    const el = document.getElementById(this.id)
    if (el) el.innerHTML = ''
    this._svgDoc = this._waveSpiral = this._playbackHead = this._pauseButton = null
  }

  _createHtml(trackInfo) {
    const container = document.getElementById(this.id)
    const wrap = document.createElement('div')
    wrap.className = 'spiral-player'
    const obj = document.createElement('object')
    obj.id = 'svg-' + this.id
    obj.className = 'svg-object'
    obj.type = 'image/svg+xml'
    obj.data = 'svg/' + trackInfo.svgId + '.svg'
    wrap.appendChild(obj)
    container.appendChild(wrap)
  }

  _loadAudio(cb) {
    this.pauseState = 'loading'
    document.querySelectorAll('.track-title').forEach(el => el.textContent = 'loading')

    const req = new XMLHttpRequest()
    req.open('GET', encodeURI(this.trackInfo.url), true)
    req.responseType = 'arraybuffer'
    req.onload = () => {
      this.context.decodeAudioData(req.response, buffer => {
        this.buffer = buffer
        this.pauseState = 'loaded'
        document.querySelectorAll('.track-title').forEach(el => el.textContent = this.trackInfo.title)
        if (cb) cb()
      })
    }
    req.send()
  }

  _pauseClick() {
    switch (this.pauseState) {
      case 'playing':        this._pause();     break
      case 'paused':
      case 'loaded':         this.play();       break
      case 'reset':          this._loadAudio(); break
    }
  }

  play() {
    this.source = this.context.createBufferSource()
    this.source.buffer = this.buffer
    this.source.onended = () => this._onSourceEnded()
    this.source.connect(this.lopass)
    this.source.connect(this.delaySend)
    this.source.start(0, this.trackPosition)
    this.startedAt = this.context.currentTime
    this.pauseState = 'playing'
    this._setButtonClass('playbutton')
    this._startAnimation()
  }

  _pause() {
    this.source.stop()
    this.trackPosition += this.context.currentTime - this.startedAt
    this.pauseState = 'paused'
    cancelAnimationFrame(this._rafId)
    this._rafId = null
    this._setButtonClass('pausebutton')
  }

  _stop() {
    cancelAnimationFrame(this._rafId)
    this._rafId = null
    this.startedAt = 0
    this.trackPosition = 0
    this.pauseState = 'paused'
    this.buffer = null
    try { if (this.source) this.source.stop(0) } catch (e) {}
    this.source = null
  }

  _onSourceEnded() {
    if (this.pauseState !== 'playing') return
    cancelAnimationFrame(this._rafId)
    this._rafId = null
    if (this._waveSpiral)   this._waveSpiral.style.transform = ''
    if (this._playbackHead) this._playbackHead.style.transform = ''
    this.pauseState = 'reset'
    this.trackPosition = 0
    this._setButtonClass('pausebutton')
    this.onEnded()
  }

  // rAF loop keeps animation exactly in sync with audio context time
  _startAnimation() {
    const totalRotation = this.imageInfo.totalTurns * 360
    const headEnd = this.imageInfo.playbackDistance

    const tick = () => {
      if (this.pauseState !== 'playing') return
      const progress = Math.min(
        (this.context.currentTime - this.startedAt + this.trackPosition) / this.buffer.duration,
        1
      )
      if (this._waveSpiral)
        this._waveSpiral.style.transform = `rotate(${progress * totalRotation}deg)`
      if (this._playbackHead)
        this._playbackHead.style.transform = `translateX(-${progress * headEnd}px)`
      this._rafId = requestAnimationFrame(tick)
    }
    this._rafId = requestAnimationFrame(tick)
  }

  _setButtonClass(cls) {
    if (!this._pauseButton) return
    this._pauseButton.classList.remove('pausebutton', 'playbutton')
    this._pauseButton.classList.add(cls)
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const { artist, title, tracks, links = [] } = window.albumConfig
  const player = new Waveform('long')

  // Album header
  const headerEl = document.getElementById('player-header')
  if (headerEl) {
    headerEl.innerHTML = `
      <div class="player-header-artist">${artist}</div>
      <div class="player-header-title">${title}</div>
    `
  }

  // Build track list panel from albumConfig
  const listEl = document.getElementById('track-list')
  if (listEl) {
    const header = document.createElement('div')
    header.className = 'track-list-header'
    header.innerHTML = `
      <div class="album-artist">${artist}</div>
      <div class="album-name">${title}</div>
      <div class="album-count">${tracks.length} tracks</div>
    `
    listEl.appendChild(header)

    const table = document.createElement('div')
    table.className = 'track-table'

    tracks.forEach((track, i) => {
      const a = document.createElement('a')
      a.href = '#'
      a.className = 'track-item'
      a.dataset.id = track.id

      const num = document.createElement('span')
      num.className = 'track-num'
      num.textContent = String(i + 1).padStart(2, '0')

      const name = document.createElement('span')
      name.className = 'track-name'
      name.textContent = track.title

      a.appendChild(num)
      a.appendChild(name)

      a.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        setActiveTrack(track.id)
        if (player.pauseState !== 'reset') {
          player.run(track, () => player.play())
        } else {
          player.run(track)
        }
      })

      table.appendChild(a)
    })

    listEl.appendChild(table)

    // Stream links section
    if (links.length > 0) {
      const linksEl = document.createElement('div')
      linksEl.className = 'track-list-links'
      const label = document.createElement('div')
      label.className = 'track-list-links-label'
      label.textContent = 'Listen on'
      linksEl.appendChild(label)
      links.forEach(({ name, url }) => {
        const a = document.createElement('a')
        a.className = 'stream-link'
        a.href = url
        a.target = '_blank'
        a.rel = 'noopener'
        a.textContent = name
        linksEl.appendChild(a)
      })
      listEl.appendChild(linksEl)
    }
  }

  function setActiveTrack(id) {
    if (!listEl) return
    listEl.querySelectorAll('.track-item').forEach(el => {
      el.classList.toggle('is-playing', el.dataset.id === id)
    })
  }

  // Bootstrap navbar hamburger toggle (no Bootstrap JS needed)
  document.querySelectorAll('[data-toggle="collapse"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.dataset.target)
      if (target) target.classList.toggle('in')
    })
  })

  // Load initial track (from ?id= param or first track)
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  const initial = tracks.find(t => t.id === id) || tracks[0]
  setActiveTrack(initial.id)
  player.run(initial)

  // Auto-advance to next track after 3s gap
  player.onEnded = () => {
    const idx = tracks.findIndex(t => t.url === player.trackInfo.url)
    if (idx > -1 && idx + 1 < tracks.length) {
      const next = tracks[idx + 1]
      setTimeout(() => {
        setActiveTrack(next.id)
        player.run(next, () => player.play())
      }, 3000)
    }
  }
})
