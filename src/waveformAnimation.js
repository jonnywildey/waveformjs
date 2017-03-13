class WaveformAnimation {
  constructor (opts) {
    this._waveform = opts
  }
  /**
   * Animate (or stop animating) the svg
   */
  animate (state) {
    const position = this._waveform.song.currentTime / this._waveform.song.duration
    // progress
    const totalRotation = this._waveform.imageInfo.totalTurns * 360
    const size = this._waveform.imageInfo.size
    const hSize = size * 0.5
    // relative distance to where head should eventually end
    const headEnd = this._waveform.imageInfo.playbackDistance
    // calculate current angle
    const currentAngle = position * totalRotation
    const currentDistance = position * headEnd
    const msDur = (this._waveform.song.duration - this._waveform.song.currentTime) * 1000 // ms
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
