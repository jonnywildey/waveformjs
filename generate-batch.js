#!/usr/bin/env node
// generate-batch.js — batch SVG + JSON waveform generator
//
// Requirements: Node.js 18+, ffmpeg in PATH (brew install ffmpeg)
//
// Usage:
//   node generate-batch.js <audio-directory> <album-slug>
//
// Example:
//   node generate-batch.js "audio/Alphabets Heaven - Eternal Infraviolet Sunset EP" eternal-infraviolet
//
// Outputs:
//   svg/<album-slug>/<track>.mp3.svg
//   json/<album-slug>/<track>.mp3.json

'use strict'
const fs   = require('node:fs')
const path = require('node:path')
const { execFileSync, spawnSync } = require('node:child_process')

// ─── DSP utilities (identical to generate.html) ──────────────────────────────

const dsp = {
  interpolateBuffer(buffer, index) {
    const fi = Math.floor(index)
    const ci = Math.min(Math.ceil(index), buffer.length - 1)
    const d  = index - fi
    return buffer[fi] + (buffer[ci] - buffer[fi]) * d
  },

  windowedAmplitude(buffer, start, end) {
    const sf  = Math.floor(start)
    const ec  = Math.min(Math.ceil(end), buffer.length)
    const len = end - start
    const hLen = len * 0.5
    let c = 0
    for (let i = sf; i < ec; i++) {
      const pos = i - sf
      const amp = pos < hLen ? pos / hLen : (pos - hLen) / hLen
      c += Math.abs(buffer[i]) * amp
    }
    return c / hLen * 2
  },
}

// ─── Spiral generator (identical to generate.html) ───────────────────────────

const generator = {
  resolution:      1,
  innerLabelSize:  0.222,
  gap:             0.1,
  signalFattening: 0.2,

  generate(ch0, ch1, durationMs) {
    const size       = 1000
    const totalTurns = this._calculateTurns(durationMs)
    const path       = this._drawWaveSpiral(totalTurns, ch0, ch1, size)
    return {
      svg:  this._createSvg(size, path, totalTurns),
      json: this._createJson(size, totalTurns),
    }
  },

  _calculateTurns(durationMs) {
    const mDur = durationMs / 60000
    return Math.round(Math.tanh(mDur * 2 / 60) * 8 + 2)
  },

  _gapAmp() {
    return (1 - this.gap) * 0.5
  },

  _outerRadius(size, totalTurns) {
    const r = size * 0.5
    return r - ((r - r * this.innerLabelSize) / totalTurns) * this._gapAmp()
  },

  _innerRadius(size, totalTurns) {
    return this._outerRadius(size, totalTurns) * this.innerLabelSize
  },

  _calculatePlaybackDistance(size, totalTurns) {
    const outer = this._outerRadius(size, totalTurns)
    return outer - outer * this.innerLabelSize
  },

  _calculateInnerLabelRadius(size, totalTurns) {
    const outer = size * 0.5
    const inner = outer * this.innerLabelSize
    return inner - ((outer - inner) / 3) * this._gapAmp()
  },

  _calculatePlaybackStartMagnitude(size, totalTurns) {
    return ((size * 0.5 - size * 0.5 * this.innerLabelSize) / totalTurns) * this._gapAmp()
  },

  _calculatePlaybackHeadPoints(size, totalTurns) {
    const hSize = size * 0.5
    const tSize = size * 0.02
    const shift = this._calculatePlaybackStartMagnitude(size, totalTurns)
    return `${size - shift},${hSize} ${size - shift - tSize},${hSize + tSize * 2} ${size - shift + tSize},${hSize + tSize * 2}`
  },

  _polarToCart(r, a, cx, cy) {
    return [r * Math.cos(a) + cx, r * Math.sin(a) + cy]
  },

  _lengthOfSpiral(a, b, totalTurns) {
    const f = (t) => Math.sqrt((a + b * t) ** 2 + b ** 2)
    return f(totalTurns * Math.PI * 2) - f(0)
  },

  _sampleSignal(signal, i, scaleFactor) {
    if (scaleFactor > 1) {
      return dsp.windowedAmplitude(signal, i * scaleFactor, (i + 1) * scaleFactor)
    }
    return dsp.interpolateBuffer(signal, i * scaleFactor)
  },

  _drawWaveSpiral(totalTurns, ch0, ch1, size) {
    const cx         = size * 0.5
    const cy         = size * 0.5
    const gapAmp     = this._gapAmp()
    const outer      = this._outerRadius(size, totalTurns)
    const inner      = this._innerRadius(size, totalTurns)
    const incrPerTurn = (outer - inner) / totalTurns
    const amplification = incrPerTurn * gapAmp
    const b          = incrPerTurn / (2 * Math.PI)
    const lineLength = this._lengthOfSpiral(inner, b, totalTurns)
    const scaleFactor = ch0.length / (outer - inner)
    const orbit      = Math.PI * 2 * totalTurns
    const step       = this.resolution * 0.01
    let pathStr      = ''

    for (let a = 0; a <= orbit; a += step) {
      let disp = this._sampleSignal(ch0, ((orbit - a) / orbit) * lineLength, scaleFactor)
      disp = Math.pow(Math.max(disp, 0), 1 - this.signalFattening)
      const r = inner + b * a - disp * amplification
      const [x, y] = this._polarToCart(r, a, cx, cy)
      pathStr += a === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)} ` : `L${x.toFixed(2)} ${y.toFixed(2)} `
    }

    for (let a = orbit; a >= 0; a -= step) {
      let disp = this._sampleSignal(ch1, ((orbit - a) / orbit) * lineLength, scaleFactor)
      disp = Math.pow(Math.max(disp, 0), 1 - this.signalFattening)
      const r = inner + b * a + disp * amplification
      const [x, y] = this._polarToCart(r, a, cx, cy)
      pathStr += `L${x.toFixed(2)} ${y.toFixed(2)} `
    }

    return pathStr + 'Z'
  },

  _createSvg(size, pathData, totalTurns) {
    const hSize   = size * 0.5
    const innerR  = this._calculateInnerLabelRadius(size, totalTurns)
    const rHeight = innerR * 0.95
    const barWidth = rHeight * 0.2
    const lStart  = hSize - barWidth * 2
    const rStart  = hSize + barWidth
    const round   = barWidth * 0.2
    const circleLess = hSize - innerR * 0.5
    const x       = barWidth

    return `<?xml-stylesheet href="../../style/waveformjs.css" type="text/css"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0 0 ${size} ${size}">
  <path class="svg-wave" id="sp" d="${pathData}"/>
  <svg class="pausebutton" id="pausebutton">
    <circle cx="${hSize}" cy="${hSize}" id="pausestart" class="pausestart" r="${innerR.toFixed(2)}"/>
    <rect height="${rHeight.toFixed(2)}" width="${barWidth.toFixed(2)}" y="${circleLess.toFixed(2)}" rx="${round.toFixed(2)}" ry="${round.toFixed(2)}" x="${lStart.toFixed(2)}" class="pausesymbol"/>
    <rect height="${rHeight.toFixed(2)}" width="${barWidth.toFixed(2)}" y="${circleLess.toFixed(2)}" rx="${round.toFixed(2)}" ry="${round.toFixed(2)}" x="${rStart.toFixed(2)}" class="pausesymbol"/>
    <polygon points="${(hSize + x * 3).toFixed(2)},${hSize} ${(hSize - x * 2).toFixed(2)},${(hSize + x * 3).toFixed(2)} ${(hSize - x * 2).toFixed(2)},${(hSize - x * 3).toFixed(2)}" class="playsymbol"/>
  </svg>
  <polygon id="playback-head" class="playback-head" points="${this._calculatePlaybackHeadPoints(size, totalTurns)}"/>
</svg>`
  },

  _createJson(size, totalTurns) {
    return {
      size,
      innerLabelRadius:       this._calculateInnerLabelRadius(size, totalTurns),
      playbackStartMagnitude: size - this._calculatePlaybackStartMagnitude(size, totalTurns),
      playbackDistance:       this._calculatePlaybackDistance(size, totalTurns),
      totalTurns,
    }
  },
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const [,, audioDir, albumSlug] = process.argv

if (!audioDir || !albumSlug) {
  console.error('Usage: node generate-batch.js <audio-directory> <album-slug>')
  console.error('Example: node generate-batch.js "audio/Alphabets Heaven - Eternal Infraviolet Sunset EP" eternal-infraviolet')
  process.exit(1)
}

if (!fs.existsSync(audioDir)) {
  console.error(`Directory not found: ${audioDir}`)
  process.exit(1)
}

// Verify ffmpeg is available
const ffmpegCheck = spawnSync('ffmpeg', ['-version'], { stdio: 'pipe' })
if (ffmpegCheck.error) {
  console.error('ffmpeg not found in PATH. Install it with:  brew install ffmpeg')
  process.exit(1)
}

const files = fs.readdirSync(audioDir)
  .filter(f => /\.mp3$/i.test(f))
  .sort()

if (files.length === 0) {
  console.error(`No .mp3 files found in: ${audioDir}`)
  process.exit(1)
}

const svgOutDir  = path.join('svg',  albumSlug)
const jsonOutDir = path.join('json', albumSlug)
fs.mkdirSync(svgOutDir,  { recursive: true })
fs.mkdirSync(jsonOutDir, { recursive: true })

console.log(`\nProcessing ${files.length} track(s) → ${albumSlug}/\n`)

for (const filename of files) {
  const inputPath = path.join(audioDir, filename)
  const slug      = toSlug(filename)
  process.stdout.write(`  ${filename.padEnd(55)} `)

  // Decode audio to interleaved float32 PCM at 44100 Hz stereo via ffmpeg
  let pcmBuffer
  try {
    pcmBuffer = execFileSync('ffmpeg', [
      '-i', inputPath,
      '-f',      'f32le',
      '-acodec', 'pcm_f32le',
      '-ar',     '44100',
      '-ac',     '2',
      'pipe:1',
    ], {
      stdio:     ['pipe', 'pipe', 'pipe'],
      maxBuffer: 512 * 1024 * 1024,  // 512 MB — enough for ~25 min stereo
    })
  } catch (err) {
    console.error('ffmpeg error:', err.message)
    process.exit(1)
  }

  // pcmBuffer is a Node Buffer; slice to a fresh ArrayBuffer to avoid pool-offset issues
  const ab     = pcmBuffer.buffer.slice(pcmBuffer.byteOffset, pcmBuffer.byteOffset + pcmBuffer.byteLength)
  const floats = new Float32Array(ab)

  const sampleCount = floats.length / 2
  const ch0 = new Float32Array(sampleCount)
  const ch1 = new Float32Array(sampleCount)
  for (let i = 0; i < sampleCount; i++) {
    ch0[i] = floats[i * 2]
    ch1[i] = floats[i * 2 + 1]
  }

  const durationMs = sampleCount / 44100 * 1000
  const { svg, json } = generator.generate(ch0, ch1, durationMs)

  fs.writeFileSync(path.join(svgOutDir,  slug + '.svg'),  svg)
  fs.writeFileSync(path.join(jsonOutDir, slug + '.json'), JSON.stringify(json))

  console.log(`→ ${slug}`)
}

console.log('\nDone.')

// ─── Helpers ─────────────────────────────────────────────────────────────────

// "02 - Alphabets Heaven - Dream World.mp3" → "dream-world.mp3"
function toSlug(filename) {
  const parts = path.basename(filename).split(' - ')
  return parts[parts.length - 1].toLowerCase().replace(/\s+/g, '-')
}
