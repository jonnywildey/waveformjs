const FxUnit = require('./fxUnit')
class DelayFx extends FxUnit {
  constructor (context) {
    super()
    this.context = context
    this.setupNodes(context)
    this.setupMappings(context)
  }

  setupNodes (context) {
    // send gain
    this.send = context.createGain()
    this.send.gain.value = 0
    // delay line
    this.delay = context.createDelay(1.5)
    this.delay.delayTime.value = 0.35
    // feedback gain
    this.feedback = context.createGain()
    this.feedback.gain.value = 0.4
    // Lowpass like them analog delays
    this.lowpass = context.createBiquadFilter()
    this.lowpass.type = 'lowpass'
    this.lowpass.gain.value = -6
    this.lowpass.Q.value = 3
    this.lowpass.frequency.value = 2000
    // high pass to get rid of lame low hz feedback
    this.hipass = context.createBiquadFilter()
    this.hipass.type = 'highpass'
    this.hipass.gain.value = -6
    this.hipass.Q.value = 1
    this.hipass.frequency.value = 150
    // compression to make it sound more legit
    this.compressor = context.createDynamicsCompressor()
    this.compressor.threshold.value = -30
    this.compressor.knee.value = 40
    this.compressor.ratio.value = 4
    this.compressor.attack.value = 0.015
    this.compressor.release.value = 0.078
    // inner connections
    this.send.connect(this.lowpass)
    this.lowpass.connect(this.delay)
    this.delay.connect(this.feedback)
    this.feedback.connect(this.hipass)
    this.hipass.connect(this.compressor)
    this.compressor.connect(this.lowpass)
    this._output = this.delay
  }

  setupMappings (context) {
    const delayTime = $('#delay-time')
    delayTime.on('input', () => {
      const time = delayTime.val()
      console.log('delay-time', time)
      this.delay.delayTime.value = time
    })

    const delayFeedback = $('#delay-feedback')
    delayFeedback.on('input', () => {
      const feed = delayFeedback.val()
      console.log('delay-feed', feed)
      this.feedback.gain.value = feed
    })

    const delaySend = $('#delay-send')
    delaySend.on('input', () => {
      const val = delaySend.val()
      console.log('delay-send', val)
      this.send.gain.value = val
    })
  }

  set source (source) {
    super.source = source
    source.connect(this.send)
  }

  get source () {
    return super.source
  }
}

module.exports = DelayFx
