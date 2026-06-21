#!/usr/bin/env node
// add-vignette.js — add a radial dark vignette to release artwork
//
// Requirements: ffmpeg in PATH (brew install ffmpeg)
// Usage:  node add-vignette.js <image.jpg> [image2.jpg ...]
// Output: saves <name>back<.ext> alongside each input file
//
// Tweak these to taste:
const STRENGTH = 1.18; // how dark the edges get (0 = none, 1 = full black)
const INNER_RADIUS = 0.2; // normalised radius where darkening begins
// (0 = whole image, 1 = only corners darken)

const { execSync } = require("child_process");
const path = require("path");

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node add-vignette.js <image.jpg> [image2.jpg ...]");
  process.exit(1);
}

// hypot((X-W/2)/(W/2), (Y-H/2)/(H/2)):
//   0   at centre
//   1   at edge midpoints
//  ~1.41 at corners
//
// We ramp from INNER_RADIUS → sqrt(2) and multiply each channel
// by (1 - STRENGTH * ramp), clamped to [0, 1].
const SQRT2 = Math.sqrt(2).toFixed(6);
const ramp = `max(0,min(1,(hypot((X-W/2)/(W/2),(Y-H/2)/(H/2))-${INNER_RADIUS})/(${SQRT2}-${INNER_RADIUS})))`;
const fade = `max(0,1-${STRENGTH}*${ramp})`;
// format=rgb24 ensures geq sees real RGB channels, not YUV
const filter = `format=rgb24,geq=r='r(X,Y)*${fade}':g='g(X,Y)*${fade}':b='b(X,Y)*${fade}'`;

for (const file of files) {
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  const dir = path.dirname(file);
  const output = path.join(dir, base + "back" + ext);

  try {
    // -update 1: tells image2 muxer to write a single file, not a sequence
    execSync(
      `ffmpeg -y -i "${file}" -vf "${filter}" -q:v 2 -update 1 "${output}"`,
      {
        stdio: "inherit",
      },
    );
    console.log(`✓  ${output}`);
  } catch {
    console.error(`✗  failed: ${file}`);
  }
}
