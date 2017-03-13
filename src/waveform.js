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
  /**
   * Play
   */
  play () {
    // play
    this.song.play()
    // set state
    this.pauseState = 'playing'
    this.pauseButton.addClass('playbutton')
    this.pauseButton.removeClass('pausebutton')
    this.animate('play')
  }

  ended () {
    console.log('has ended')
    this.animate('end')
    this.pauseState = 'reset'
    this.pauseButton.addClass('pausebutton')
    this.pauseButton.removeClass('playbutton')
  }

  /**
   * Pause
   */
  pause () {
    // stop animation
    this.pauseState = 'paused'
    this.pauseButton.addClass('pausebutton')
    this.pauseButton.removeClass('playbutton')
    this.song.pause()
    this.animate('pause')
  }

  run (trackInfo) {
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
        this.loadAudio()
      })
    })
  }

  // remove previous svg if it exists
  clear () {
    if (this.divId != null) {
      this.divId.empty()
    }
  }

  /**
   * Stop audio if it is playing
   */
  stop () {
    try {
      this.song.pause()
      delete this.song
    } catch (err) {
      // do nothing
    }
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

  _createSong (url) {
    const sound = document.createElement('audio')
    sound.id = 'audio-player'
    sound.controls = 'controls'
    sound.src = url
    sound.type = 'audio/mpeg'
    return sound
  }

  /**
   * load audio
   */
  loadAudio () {
    this.song = this._createSong(this.track.url)
    this.song.load()
    this.song.oncanplay = () => {
      // set new audio source
      this.source = this.context.createMediaElementSource(this.song)
      // attach source to fx
      this.mixer.source = this.source
      // add ended call
      this.song.onended = () => this.ended()
      this.svgObj.removeClass('loading')
      this.pauseState = 'loaded'
      $('.track-title').html(this.trackInfo.title)
    }
  }
}

module.exports = Waveform
