const Snap = require(`imports-loader?this=>window,fix=>module.exports=0!snapsvg/dist/snap.svg.js`)

class Waveform {
  constructor () {
    this.context = null
    this.buffer = null
    this.source = null
    this.svgObj = null
    this.pauseButton = null
    this.waveSpiral = null
    this.pauseState = null
    this.playbackHead = null
    this.imageInfo = null
    this.hasPlayedBefore = false
    this.trackInfo = false
    this.divId = null
    this.startedAt = 0
    this.pausedAt = 0
  }

  /**
   * Initialise
   */
  init (id) {
    this.svgObj = Snap.select('#svg-' + id)
    this.waveSpiral = this.svgObj.select('#sp')
    this.pauseButton = this.svgObj.select('#pausebutton')
    this.playbackHead = this.svgObj.select('#playback-head')
    this.pauseButton.click(this.pauseClick.bind(this))
    this.pauseState = 'reset'
  }

  getTrackInfo () {
    return this.trackInfo
  }

  /**
   * When pause button is clicked
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

  /**
   * Animate (or stop animating) the svg
   */
  animate (state) {
    // clearInterval(this.syncFunc)
    const position = this.getPosition()
    console.log('progress', position)
    // progress
    const totalRotation = this.imageInfo.totalTurns * 360
    const size = this.imageInfo.size
    const hSize = size * 0.5
    // relative distance to where head should eventually end
    // const headStart = this.imageInfo.playbackStartMagnitude
    const headEnd = hSize - (this.imageInfo.innerLabelRadius * 3)
    // calculate current angle
    const currentAngle = position * totalRotation
    const currentDistance = position * headEnd
    const msDur = (this.buffer.duration - position) * 1000 // ms
    console.log('ms', msDur)
    switch (state) {
      case 'play':
        this.animateObjects(totalRotation, headEnd, hSize, msDur)
        break
      case 'pause':
        this.stopAnimation()
        break
      case 'sync':
        this.transformObjects(currentAngle, currentDistance, hSize)
        this.animateObjects(totalRotation, headEnd, hSize, msDur)
        break
      case 'end':
        this.animateObjects(-totalRotation, -headEnd, hSize, 3000)
    }
  }

  /**
   * Animate objects
   */
  animateObjects (wAngle, pDistance, centre, duration) {
    this.waveSpiral.stop().animate(
      { transform: 'r' + wAngle + ',' + centre + ',' + centre },
      duration)
    this.playbackHead.stop().animate(
      { transform: 't-' + pDistance + ',0' },
      duration
      )
  }

  stopAnimation () {
    this.waveSpiral.stop()
    this.playbackHead.stop()
  }

  /**
   * Transform objects
   */
  transformObjects (wAngle, pDistance, centre) {
    this.waveSpiral.stop().transform('r' + wAngle + ',' + centre + ',' + centre)
    this.playbackHead.stop().transform('t-' + pDistance + ',0')
  }

  setPlaybackRate (speed) {
    this.source.playbackRate.value = speed
  }

  playSound () {
    this.source = this.context.createBufferSource() // creates a sound source
    this.source.buffer = this.buffer                    // tell the source which sound to play
    this.source.connect(this.context.destination)       // connect the source to the context's destination (the speakers)
    this.startedAt = this.context.currentTime
    this.source.start(0, this.pausedAt)

    this.source.onended = () => this.ended()
  }

  /**
   * Play
   */
  play () {
    this.playSound()
    this.pauseState = 'playing'
    this.pauseButton.addClass('playbutton')
    this.pauseButton.removeClass('pausebutton')
    this.animate('play')
  }

  /**
   * Pause
   */
  pause () {
    this.pausedAt = this.context.currentTime
    // stop animation
    this.pauseState = 'paused'
    this.pauseButton.addClass('pausebutton')
    this.pauseButton.removeClass('playbutton')
    this.source.stop(0)
    this.animate('pause')
  }

  getPosition () {
    switch (this.pauseState) {
      case 'paused':
        return this.pausedAt / this.buffer.duration
      case 'playing':
        return (this.context.currentTime - this.startedAt) / this.buffer.duration
      case 'loaded':
      case 'reset':
      default:
        return 0
    }
  }

  ended () {
    if (this.pauseState !== 'paused') {
      console.log('has ended')
      this.animate('end')
      this.pauseState = 'reset'
      this.pausedAt = null
      this.pauseButton.addClass('pausebutton')
      this.pauseButton.removeClass('playbutton')
    }
  }

  requestAudio (url, cb) {
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
   * load audio
   */
  loadAudio () {
    this.requestAudio(this.track.url, (buffer) => {
      this.buffer = buffer
      if (this.pauseState === 'loading') {
        this.svgObj.removeClass('loading')
        this.pauseState = 'loaded'
        $('.track-title').html(this.trackInfo.title)
      }
    })
    this.pauseState = 'loading'
    this.svgObj.addClass('loading')
    $('.track-title').html('loading')
  }

  clear () {
    if (this.divId != null) {
      this.divId.empty()
    }
  }

  stop () {
    if (this.source) {
      this.source.stop(0)
      this.startedAt = 0
      this.pausedAt = 0
    }
  }

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

  run (id, trackInfo) {
    this.clear()
    this.stop()
    this.createHtml(id, trackInfo)
    $.getJSON('json/' + trackInfo.svgId + '.json', (data) => {
      this.imageInfo = data
      // setup audio
      const svg = document.getElementById('svg-' + id)
      svg.addEventListener('load', () => {
        this.init(id)
        this.context = new AudioContext()
        this.track = trackInfo
        this.loadAudio()
      })
    })
  }
}

module.exports = Waveform
