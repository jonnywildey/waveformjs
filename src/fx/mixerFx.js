const FxUnit = require('./fxUnit')

class MixerFx extends FxUnit {
  constructor (context) {
    super()
    this.context = context
    this.setupNodes(context)
    this.setupMappings(context)
  }

  setupNodes (context) {
    // fader
    this.gain = context.createGain()
    // filter
    this.lopass = context.createBiquadFilter()
    this.lopass.type = 'lowpass'
    this.lopass.gain.value = 0
    this.lopass.Q.value = 10
    this.lopass.frequency.value = 20000
    this.lopass.connect(this.gain)
    this._output = this.gain
  }

  setupMappings (context) {
    const volume = $('#volume')
    volume.on('input', () => {
      const vol = volume.val()
      console.log('gain', vol)
      this.gain.gain.value = vol
    })
    const lowpass = $('#filter')
    lowpass.on('input', () => {
      const minlval = Math.log(100)
      const maxlval = Math.log(20000)
      const scale = (maxlval - minlval)
      const freqMag = lowpass.val()
      const freq = Math.exp((freqMag) * scale + minlval)
      console.log('freq', freq)
      this.lopass.frequency.value = freq
    })
  }

  get output () {
    return super.output
  }

  set source (source) {
    super.source = source
    source.connect(this.lopass)
  }

  get source () {
    return super.source
  }
}

module.exports = MixerFx
