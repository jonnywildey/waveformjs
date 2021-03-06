const Snap = require(`imports-loader?this=>window,fix=>module.exports=0!snapsvg/dist/snap.svg.js`)
const MixerFx = require('./fx/mixerFx')
const DelayFx = require('./fx/delayFx')
const WaveformAnimation = require('./waveformAnimation')

class Waveform {
  constructor (id) {
    this.id = id
    this.context = this.getContext() // audio context
    this.source = null // audio source, set via run
    this.imageInfo = null // info allowing svg to sync with audio
    this.trackInfo = false // general info about track, name etc.
    // svg
    this.divId = null // div to insert svg into
    this.svgObj = null // svg waveform object
    this.pauseButton = null // pause button from svg
    this.waveSpiral = null // wave image from svg
    this.playbackHead = null // head object from svg
    // playback
    this.pauseState = 'reset' // current pause / playback state
    this.startedAt = 0 // time we started
    this.pausedAt = 0 // time we paused
    this.trackPosition = 0
    this.setupNodes()
    this.waveformAnimation = new WaveformAnimation(this)
  }

  /**
   * Setup audio nodes
   */
  setupNodes () {
    this.delay = new DelayFx(this.context)
    this.mixer = new MixerFx(this.context)
    this.mixer.output.connect(this.context.destination)
    // attach delay to mixer
    this.delay.source = this.mixer.output
    this.delay.output.connect(this.context.destination)
  }

  getContext () {
    const AudioContext = window.AudioContext || window.webkitAudioContext || null
    if (AudioContext) {
      return new AudioContext()
    }
    alert('Sorry, but the Web Audio API is not supported by your browser. Please, consider upgrading to the latest version or downloading Google Chrome or Mozilla Firefox')
  }

  animate (state) {
    return this.waveformAnimation.animate(state)
  }

  /**
   * Return track info
   */
  getTrackInfo () {
    return this.trackInfo
  }

  /**
   * When pause button is clicked, action will be dependent on current state
   */
  pauseClick () {
    switch (this.pauseState) {
      case 'playing':
        this.pause()
        break
      case 'paused':
      case 'loaded':
        this.play()
        break
      case 'reset':
        this.loadAudio()
      // case 'loading':
    }
  }

  setPlaybackRate (speed) {
    this.source.playbackRate.value = speed
  }

  getTime () {
    return this.context.currentTime
  }
  /**
   * Play
   */
  play () {
    // play
    // set new audio source
    this.source = this.context.createBufferSource() // creates a sound source
    this.source.buffer = this.buffer
    // add ended call
    this.source.onended = () => this.ended()
    this.mixer.source = this.source
    this.source.start(0, this.trackPosition)
    this.startedAt = this.getTime()
    // set state
    this.pauseState = 'playing'
    this.pauseButton.addClass('playbutton')
    this.pauseButton.removeClass('pausebutton')
    this.animate('play')
  }

  ended () {
    if (this.pauseState !== 'paused' && this.pauseState !== 'reset') {
      this.animate('end')
      this.pauseState = 'reset'
      this.pausedAt = null
      this.pauseButton.addClass('pausebutton')
      this.pauseButton.removeClass('playbutton')
      this.onEnded()
    }
  }

  onEnded () {
    // do nothing
  }

  /**
   * Pause
   */
  pause () {
    // stop animation
    this.source.stop()
    this.pausedAt = this.getTime()
    this.trackPosition += this.pausedAt - this.startedAt
    this.pauseState = 'paused'
    this.animate('pause')
    this.pauseButton.addClass('pausebutton')
    this.pauseButton.removeClass('playbutton')
  }

  run (trackInfo, cb) {
    this.track = trackInfo
    this.clear() // remove svg
    this.stop() // stop audio if it is playing
    this.createHtml(this.id, trackInfo) // create new svg
    $.getJSON('json/' + trackInfo.svgId + '.json', (data) => { // get imageInfo
      this.imageInfo = data
      // set svg objects
      this.svgObj = document.getElementById('svg-' + this.id)
      this.svgObj.addEventListener('load', () => {
        this.svgObj = Snap.select('#svg-' + this.id)
        this.waveSpiral = this.svgObj.select('#sp')
        this.pauseButton = this.svgObj.select('#pausebutton')
        this.playbackHead = this.svgObj.select('#playback-head')
        this.pauseButton.click(this.pauseClick.bind(this))
        this.pauseState = 'reset'
        // load audio
        this.loadAudio(cb)
      })
    })
  }

  // remove previous svg if it exists
  clear () {
    if (this.divId) {
      this.divId.empty()
    }
  }

  /**
   * Stop audio if it is playing
   */
  stop () {
    this.startedAt = 0
    this.pausedAt = 0
    this.trackPosition = 0
    this.pauseState = 'paused'
    this.buffer = null
    try {
      this.source.stop(0)
    } catch (err) {
      // do nothing
    }
  }

  /**
   * get audio from url
   */
  _requestAudio (url, cb) {
    const request = new XMLHttpRequest()
    request.open('GET', url, true)
    request.responseType = 'arraybuffer'
    // Decode asynchronously
    request.onload = () => {
      this.context.decodeAudioData(request.response, cb, (err) => { console.err(err) })
    }
    request.send()
  }

  /**
   * Create waveform html
   */
  createHtml (id, trackInfo) {
    this.divId = $('#' + id)
    this.trackInfo = trackInfo
    // create objects
    const playerDiv = $('<div/>', {
      'class': 'spiral-player'
    })
    $('<object id="svg-' + id + '"class="svg-object" type="image/svg+xml" data="svg/' + trackInfo.svgId +
      '.svg"></object>').appendTo(playerDiv)
    playerDiv.appendTo(this.divId)
  }

  /**
   * load audio
   */
  loadAudio (cb) {
    this.pauseState = 'loading'
    this.svgObj.addClass('loading')
    $('.track-title').html('loading')
    this._requestAudio(this.track.url, (buffer) => {
      this.buffer = buffer
      this.loadedAt = this.getTime()
      // attach source to fx
      this.svgObj.removeClass('loading')
      this.pauseState = 'loaded'
      $('.track-title').html(this.trackInfo.title)
      if (cb) {
        cb()
      }
    })
  }
}

module.exports = Waveform
