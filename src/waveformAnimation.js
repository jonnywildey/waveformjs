class WaveformAnimation {
  constructor (opts) {
    this._waveform = opts
  }
  /**
   * Animate (or stop animating) the svg
   */
  animate (state) {
    // progress
    const totalRotation = this._waveform.imageInfo.totalTurns * 360
    const size = this._waveform.imageInfo.size
    const hSize = size * 0.5
    // relative distance to where head should eventually end
    const headEnd = this._waveform.imageInfo.playbackDistance
    const msDur = (this._waveform.buffer.duration - this._waveform.trackPosition) * 1000 // ms
    switch (state) {
      case 'play':
        this.animateObjects(totalRotation, headEnd, hSize, msDur)
        break
      case 'pause':
        this.stopAnimation()
        break
      case 'end':
        this.animateObjects(0, -headEnd, hSize, 3000)
    }
  }

  /**
   * Animate objects
   */
  animateObjects (wAngle, pDistance, centre, duration) {
    this._waveform.waveSpiral.stop().animate(
      { transform: 'r' + wAngle + ',' + centre + ',' + centre },
      duration)
    this._waveform.playbackHead.stop().animate(
      { transform: 't-' + pDistance + ',0' },
      duration
      )
  }

  stopAnimation () {
    this._waveform.waveSpiral.stop()
    this._waveform.playbackHead.stop()
  }

  /**
   * Transform objects
   */
  transformObjects (wAngle, pDistance, centre) {
    this._waveform.waveSpiral.stop().transform('r' + wAngle + ',' + centre + ',' + centre)
    this._waveform.playbackHead.stop().transform('t-' + pDistance + ',0')
  }
}

module.exports = WaveformAnimation
