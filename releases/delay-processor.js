class DelayProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "delayTime",
        defaultValue: 0.35,
        minValue: 0.001,
        maxValue: 1.5,
        automationRate: "k-rate",
      },
    ];
  }

  constructor() {
    super();
    const maxFrames = Math.ceil(sampleRate * 1.5) + 256;
    this._bufs = [new Float32Array(maxFrames), new Float32Array(maxFrames)];
    this._size = maxFrames;
    this._write = 0;
    // Current fractional read offset in samples (interpolated toward target)
    this._readOffset = 0.35 * sampleRate;
  }

  process(inputs, outputs, parameters) {
    const inp = inputs[0];
    const out = outputs[0];
    const nCh = out.length;
    const blockSize = nCh > 0 ? out[0].length : 128;
    const targetFrames = parameters.delayTime[0] * sampleRate;
    // Max samples of delay-time change per sample — sets the pitch-shift rate
    // 1.0 = at most one-octave shift during a transition, completes in ~1s for large jumps
    const maxStep = 2.0;

    for (let i = 0; i < blockSize; i++) {
      // Smoothly interpolate read offset toward target
      const diff = targetFrames - this._readOffset;
      this._readOffset +=
        Math.abs(diff) <= maxStep ? diff : maxStep * Math.sign(diff);

      // Fractional read position in the circular buffer
      const r =
        (((this._write - this._readOffset) % this._size) + this._size) %
        this._size;
      const r0 = r | 0;
      const r1 = (r0 + 1) % this._size;
      const frac = r - r0;

      for (let c = 0; c < nCh; c++) {
        const bufIdx = Math.min(c, this._bufs.length - 1);
        const inpIdx = Math.min(c, inp.length - 1);
        const buf = this._bufs[bufIdx];
        buf[this._write] = inp[inpIdx] ? inp[inpIdx][i] : 0;
        out[c][i] = buf[r0] * (1 - frac) + buf[r1] * frac;
      }

      this._write = (this._write + 1) % this._size;
    }

    return true;
  }
}

registerProcessor("delay-processor", DelayProcessor);
