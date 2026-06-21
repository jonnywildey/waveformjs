class Waveform {
  constructor(id) {
    this.id = id;
    this.isIos =
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    this.context = this.isIos ? null : this._createContext();
    this.source = null;
    this.buffer = null;
    this.audioEl = null;
    this.imageInfo = null;
    this.trackInfo = null;
    this._svgDoc = null;
    this._waveSpiral = null;
    this._playbackHead = null;
    this._pauseButton = null;
    this.pauseState = "reset";
    this.startedAt = 0;
    this.trackPosition = 0;
    this._rafId = null;
    this._scrubProgress = null;
    this.onEnded = () => {};
    if (!this.isIos) {
      this._setupFx();
      this._setupControls();
    } else {
      // Hide FX controls on iOS — Web Audio FX chain not used
      const fx = document.querySelector(".fx-section");
      if (fx) fx.hidden = true;
    }
  }

  _createContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      alert("Web Audio API not supported. Please use a modern browser.");
      return null;
    }
    return new Ctx();
  }

  _setupFx() {
    const ctx = this.context;

    // Volume + lowpass filter chain → output
    this.gainNode = ctx.createGain();
    this.lopass = ctx.createBiquadFilter();
    this.lopass.type = "lowpass";
    this.lopass.Q.value = 10;
    this.lopass.frequency.value = 20000;
    this.lopass.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    // Delay: send → lopass → delay → feedback → hipass → compressor → (loops) → output
    this.delaySend = ctx.createGain();
    this.delaySend.gain.value = 0;
    this.delayLine = ctx.createDelay(1.5);
    this.delayLine.delayTime.value = 0.35;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.4;
    this.delayLopass = ctx.createBiquadFilter();
    this.delayLopass.type = "lowpass";
    this.delayLopass.frequency.value = 2000;
    this.delayHipass = ctx.createBiquadFilter();
    this.delayHipass.type = "highpass";
    this.delayHipass.frequency.value = 150;
    this.delayComp = ctx.createDynamicsCompressor();
    this.delayComp.threshold.value = -30;
    this.delayComp.knee.value = 40;
    this.delayComp.ratio.value = 4;
    this.delayComp.attack.value = 0.015;
    this.delayComp.release.value = 0.078;

    this.delaySend.connect(this.delayLopass);
    this.delayLopass.connect(this.delayLine);
    this.delayLine.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayHipass);
    this.delayHipass.connect(this.delayComp);
    this.delayComp.connect(this.delayLopass);
    this.delayLine.connect(ctx.destination);
  }

  _setupControls() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", fn);
    };
    bind("volume", (e) => {
      this.gainNode.gain.value = +e.target.value;
    });
    bind("filter", (e) => {
      const min = Math.log(100),
        max = Math.log(20000);
      this.lopass.frequency.value = Math.exp(
        +e.target.value * (max - min) + min,
      );
    });
    bind("delay-time", (e) => {
      this.delayLine.delayTime.value = +e.target.value;
    });
    bind("delay-feedback", (e) => {
      this.delayFeedback.gain.value = +e.target.value;
    });
    bind("delay-send", (e) => {
      this.delaySend.gain.value = +e.target.value;
    });
  }

  run(trackInfo, cb) {
    this.trackInfo = trackInfo;
    this._clear();
    this._stop();
    this._createHtml(trackInfo);

    fetch("json/" + trackInfo.svgId + ".json")
      .then((r) => r.json())
      .then((data) => {
        this.imageInfo = data;
        const obj = document.getElementById("svg-" + this.id);
        obj.addEventListener("load", () => {
          this._svgDoc = obj.contentDocument;
          this._waveSpiral = this._svgDoc.querySelector("#sp");
          this._playbackHead = this._svgDoc.querySelector("#playback-head");
          this._pauseButton = this._svgDoc.querySelector("#pausebutton");
          // CSS transform-origin for SVG rotation must be set explicitly
          if (this._waveSpiral) {
            const c = this.imageInfo.size * 0.5 + "px";
            this._waveSpiral.style.transformOrigin = `${c} ${c}`;
          }
          // Inject page accent colour into the SVG document (CSS vars don't cross <object> boundary).
          // Use ID selectors so they outrank the class selectors in waveformjs.css.
          const accent = getComputedStyle(document.documentElement)
            .getPropertyValue("--accent")
            .trim();
          if (accent) {
            const [r, g, b] = (
              getComputedStyle(document.documentElement).getPropertyValue(
                "--accent-rgb",
              ) || ""
            )
              .split(",")
              .map((n) => parseInt(n) || 0);
            const hover = `rgb(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(255, b + 60)})`;
            const svgStyle = this._svgDoc.createElementNS(
              "http://www.w3.org/2000/svg",
              "style",
            );
            svgStyle.textContent = [
              `#playback-head{fill:${accent};stroke:transparent;stroke-width:200px;pointer-events:all}`,
              `#playback-head:hover{fill:${hover};filter:drop-shadow(0 0 8px rgba(255,255,255,0.9))}`,
              `#playback-head:active{fill:${hover};filter:drop-shadow(0 0 12px rgba(255,255,255,1))}`,
              `#pausebutton{fill:${accent}}`,
              `#pausebutton:hover{fill:${hover}}`,
              `#pausebutton:active{fill:${hover}}`,
            ].join("");
            this._svgDoc.documentElement.appendChild(svgStyle);
          }
          this._pauseButton.addEventListener("click", () => this._pauseClick());
          this.pauseState = "reset";
          this._loadAudio(cb);
        });
      });
  }

  _clear() {
    const el = document.getElementById(this.id);
    if (el) el.innerHTML = "";
    this._svgDoc =
      this._waveSpiral =
      this._playbackHead =
      this._pauseButton =
        null;
  }

  _createHtml(trackInfo) {
    const container = document.getElementById(this.id);
    const wrap = document.createElement("div");
    wrap.className = "spiral-player";
    const obj = document.createElement("object");
    obj.id = "svg-" + this.id;
    obj.className = "svg-object";
    obj.type = "image/svg+xml";
    obj.data = "svg/" + trackInfo.svgId + ".svg";
    wrap.appendChild(obj);
    container.appendChild(wrap);
  }

  _loadAudio(cb) {
    this.pauseState = "loading";
    document
      .querySelectorAll(".track-title")
      .forEach((el) => (el.textContent = "loading"));

    if (this.isIos) {
      if (this.audioEl) {
        this.audioEl.pause();
        this.audioEl.src = "";
      }
      this.audioEl = document.createElement("audio");
      this.audioEl.preload = "auto";
      this.audioEl.src = this.trackInfo.url;
      this.audioEl.addEventListener(
        "loadedmetadata",
        () => {
          this.pauseState = "loaded";
          document
            .querySelectorAll(".track-title")
            .forEach((el) => (el.textContent = this.trackInfo.title));
          const timeEl = document.getElementById("track-time");
          if (timeEl)
            timeEl.textContent = `0:00 / ${formatTime(this.audioEl.duration)}`;
          this._setupScrubbing();
          if (cb) cb();
        },
        { once: true },
      );
      this.audioEl.addEventListener("ended", () => this._onSourceEnded(), {
        once: true,
      });
      return;
    }

    const req = new XMLHttpRequest();
    req.open("GET", encodeURI(this.trackInfo.url), true);
    req.responseType = "arraybuffer";
    req.onload = () => {
      this.context.decodeAudioData(req.response, (buffer) => {
        this.buffer = buffer;
        this.pauseState = "loaded";
        document
          .querySelectorAll(".track-title")
          .forEach((el) => (el.textContent = this.trackInfo.title));
        const timeEl = document.getElementById("track-time");
        if (timeEl)
          timeEl.textContent = `0:00 / ${formatTime(this.buffer.duration)}`;
        this._setupScrubbing();
        if (cb) cb();
      });
    };
    req.send();
  }

  _setupScrubbing() {
    const head = this._playbackHead;
    if (!head) return;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartProgress = 0;
    let wasPlaying = false;

    const duration = () => this.isIos ? this.audioEl.duration : this.buffer.duration;

    const getScale = () => {
      const obj = document.getElementById("svg-" + this.id);
      return obj ? obj.getBoundingClientRect().width / this.imageInfo.size : 1;
    };

    const applyProgress = (progress) => {
      if (this._waveSpiral)
        this._waveSpiral.style.transform = `rotate(${progress * this.imageInfo.totalTurns * 360}deg)`;
      if (this._playbackHead)
        this._playbackHead.style.transform = `translateX(-${progress * this.imageInfo.playbackDistance}px)`;
      this._scrubProgress = progress;
    };

    const commitSeek = () => {
      const progress = this._scrubProgress !== null ? this._scrubProgress : dragStartProgress;
      this.trackPosition = progress * duration();
      this._scrubProgress = null;
      const resume = wasPlaying;
      wasPlaying = false;
      if (this.pauseState === "reset") {
        this.pauseState = "loaded";
        this._setButtonClass("pausebutton");
      }
      if (this.isIos) this.audioEl.currentTime = this.trackPosition;
      if (resume) this.play();
    };

    const startDrag = (clientX) => {
      isDragging = true;
      dragStartX = clientX;
      dragStartProgress = this.trackPosition / duration();
      this._scrubProgress = null;
      if (this.pauseState === "playing") {
        wasPlaying = true;
        this._pause();
      }
    };

    // ── Desktop mouse: grab the playback head ────────────────────────────────
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const p = Math.max(0, Math.min(1,
        dragStartProgress - (e.clientX - dragStartX) / getScale() / this.imageInfo.playbackDistance,
      ));
      applyProgress(p);
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      if (this._svgDoc) {
        this._svgDoc.removeEventListener("mousemove", onMouseMove);
        this._svgDoc.removeEventListener("mouseup", onMouseUp);
      }
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      commitSeek();
    };

    head.addEventListener("mousedown", (e) => {
      if (this.pauseState === "loading") return;
      e.preventDefault();
      startDrag(e.clientX);
      if (this._svgDoc) {
        this._svgDoc.addEventListener("mousemove", onMouseMove);
        this._svgDoc.addEventListener("mouseup", onMouseUp);
      }
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // ── Touch: drag anywhere on the SVG to scrub ────────────────────────────
    // Don't preventDefault on touchstart — wait for movement so taps on the
    // pause button still fire its click event.
    let touchOriginX = 0;
    let touchOriginY = 0;
    let touchScrubbing = false;

    if (this._svgDoc) {
      this._svgDoc.addEventListener("touchstart", (e) => {
        if (this.pauseState === "loading") return;
        touchOriginX = e.touches[0].clientX;
        touchOriginY = e.touches[0].clientY;
        touchScrubbing = false;
      }, { passive: true });

      this._svgDoc.addEventListener("touchmove", (e) => {
        if (this.pauseState === "loading") return;
        const dx = e.touches[0].clientX - touchOriginX;
        const dy = e.touches[0].clientY - touchOriginY;
        if (!touchScrubbing) {
          // Require 8px movement before committing to a scrub
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          touchScrubbing = true;
          startDrag(touchOriginX);
        }
        e.preventDefault();
        const p = Math.max(0, Math.min(1,
          dragStartProgress - (e.touches[0].clientX - dragStartX) / getScale() / this.imageInfo.playbackDistance,
        ));
        applyProgress(p);
      }, { passive: false });

      this._svgDoc.addEventListener("touchend", () => {
        if (!isDragging) return;
        isDragging = false;
        touchScrubbing = false;
        commitSeek();
      });
    }
  }

  _pauseClick() {
    switch (this.pauseState) {
      case "playing":
        this._pause();
        break;
      case "paused":
      case "loaded":
        this.play();
        break;
      case "reset":
        this._loadAudio();
        break;
    }
  }

  play() {
    if (this.isIos) {
      this.audioEl.currentTime = this.trackPosition;
      this.audioEl.play();
      this.pauseState = "playing";
      this._setButtonClass("playbutton");
      this._startAnimation();
      return;
    }
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.onended = () => this._onSourceEnded();
    this.source.connect(this.lopass);
    this.source.connect(this.delaySend);
    this.source.start(0, this.trackPosition);
    this.startedAt = this.context.currentTime;
    this.pauseState = "playing";
    this._setButtonClass("playbutton");
    this._startAnimation();
  }

  _pause() {
    if (this.isIos) {
      this.trackPosition = this.audioEl.currentTime;
      this.audioEl.pause();
      this.pauseState = "paused";
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
      this._setButtonClass("pausebutton");
      return;
    }
    this.source.stop();
    this.trackPosition += this.context.currentTime - this.startedAt;
    this.pauseState = "paused";
    cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._setButtonClass("pausebutton");
  }

  _stop() {
    cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this.startedAt = 0;
    this.trackPosition = 0;
    this.pauseState = "paused";
    if (this.isIos) {
      if (this.audioEl) {
        this.audioEl.pause();
        this.audioEl.currentTime = 0;
      }
      return;
    }
    this.buffer = null;
    try {
      if (this.source) this.source.stop(0);
    } catch (e) {}
    this.source = null;
  }

  _onSourceEnded() {
    if (this.pauseState !== "playing") return;
    cancelAnimationFrame(this._rafId);
    this._rafId = null;
    if (this._waveSpiral) this._waveSpiral.style.transform = "";
    if (this._playbackHead) this._playbackHead.style.transform = "";
    this.pauseState = "reset";
    this.trackPosition = 0;
    this._setButtonClass("pausebutton");
    this.onEnded();
  }

  _startAnimation() {
    const totalRotation = this.imageInfo.totalTurns * 360;
    const headEnd = this.imageInfo.playbackDistance;
    const timeEl = document.getElementById("track-time");

    const tick = () => {
      if (this.pauseState !== "playing") return;
      const elapsed = this.isIos
        ? this.audioEl.currentTime
        : this.context.currentTime - this.startedAt + this.trackPosition;
      const duration = this.isIos
        ? this.audioEl.duration
        : this.buffer.duration;
      const progress = Math.min(elapsed / duration, 1);
      if (this._waveSpiral)
        this._waveSpiral.style.transform = `rotate(${progress * totalRotation}deg)`;
      if (this._playbackHead)
        this._playbackHead.style.transform = `translateX(-${progress * headEnd}px)`;
      if (timeEl)
        timeEl.textContent = `${formatTime(elapsed)} / ${formatTime(duration)}`;
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _setButtonClass(cls) {
    if (!this._pauseButton) return;
    this._pauseButton.classList.remove("pausebutton", "playbutton");
    this._pauseButton.classList.add(cls);
  }
}

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const {
    artist,
    title,
    year,
    label,
    credits = [],
    tracks,
    links = [],
    artwork = "",
  } = window.albumConfig;
  const player = new Waveform("long");

  // Album header
  const headerEl = document.getElementById("player-header");
  if (headerEl) {
    headerEl.innerHTML = `
      <div class="player-header-artist">${artist}</div>
      <div class="player-header-title">${title}</div>
    `;
  }

  // Artwork image + lightbox + vinyl label
  const artworkImg = document.getElementById("album-artwork");
  const lightbox = document.getElementById("artwork-lightbox");
  const lightboxImg = document.getElementById("artwork-lightbox-img");
  const vinylLabel = document.getElementById("vinyl-label");
  if (artwork) {
    const alt = `${artist} — ${title}`;
    if (artworkImg) {
      artworkImg.src = artwork;
      artworkImg.alt = alt;
    }
    if (vinylLabel) {
      vinylLabel.src = artwork;
      vinylLabel.alt = alt;
    }
    if (lightbox && lightboxImg) {
      lightboxImg.src = artwork;
      lightboxImg.alt = alt;
      if (artworkImg)
        artworkImg.addEventListener("click", () => {
          lightbox.hidden = false;
        });
      lightbox.addEventListener("click", () => {
        lightbox.hidden = true;
      });
    }
  }

  // Streaming + download links under artwork
  const artworkLinksEl = document.getElementById("artwork-links");
  if (artworkLinksEl && links.length > 0) {
    const streamLinks = links.filter((l) => !l.download);
    const downloadLinks = links.filter((l) => l.download);

    if (streamLinks.length > 0) {
      const label = document.createElement("div");
      label.className = "artwork-links-label";
      label.textContent = "Listen on";
      artworkLinksEl.appendChild(label);
      streamLinks.forEach(({ name, url }) => {
        const a = document.createElement("a");
        a.className = "stream-link";
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = name;
        artworkLinksEl.appendChild(a);
      });
    }

    if (downloadLinks.length > 0) {
      const label = document.createElement("div");
      label.className = "artwork-links-label";
      label.textContent = "Download";
      artworkLinksEl.appendChild(label);
      downloadLinks.forEach(({ name, url }) => {
        const a = document.createElement("a");
        a.className = "stream-link";
        a.href = url;
        a.textContent = name;
        artworkLinksEl.appendChild(a);
      });
    }
  }

  // Credits section (static, no collapsible)
  const creditsEl = document.getElementById("release-credits");
  if (creditsEl && credits.length > 0) {
    creditsEl.innerHTML = `
      <div class="release-info-label">Credits</div>
      ${credits.map((line) => `<p class="credit-line">${line}</p>`).join("")}
    `;
  }

  // Background crossfade — fades between track-specific artwork when available
  const container = document.querySelector(".content-container");
  const bgLayer = container
    ? (() => {
        const el = document.createElement("div");
        el.className = "content-bg";
        container.insertBefore(el, container.firstChild);
        return el;
      })()
    : null;

  let currentBgArtwork = artwork;
  let fadeCancelFn = null;

  function crossfadeBackground(newArtwork) {
    if (
      !bgLayer ||
      !container ||
      !newArtwork ||
      newArtwork === currentBgArtwork
    )
      return;
    if (fadeCancelFn) fadeCancelFn();

    const overlay = getComputedStyle(document.documentElement)
      .getPropertyValue("--bg-overlay")
      .trim();
    const bgValue = `linear-gradient(${overlay}, ${overlay}), url('${newArtwork}') fixed center / cover`;

    // Reset layer instantly, set new image, then fade in
    bgLayer.style.transition = "none";
    bgLayer.style.opacity = "0";
    bgLayer.style.backgroundImage = bgValue.replace(
      " fixed center / cover",
      "",
    );
    bgLayer.style.backgroundSize = "cover";
    bgLayer.style.backgroundPosition = "center";
    bgLayer.style.backgroundAttachment = "fixed";
    void bgLayer.offsetWidth; // force reflow so transition fires
    bgLayer.style.transition = "";
    bgLayer.style.opacity = "1";

    const onEnd = () => {
      fadeCancelFn = null;
      container.style.backgroundImage = bgLayer.style.backgroundImage;
      bgLayer.style.transition = "none";
      bgLayer.style.opacity = "0";
      void bgLayer.offsetWidth;
      bgLayer.style.transition = "";
      currentBgArtwork = newArtwork;
    };
    bgLayer.addEventListener("transitionend", onEnd, { once: true });
    fadeCancelFn = () => bgLayer.removeEventListener("transitionend", onEnd);

    // Fade artwork panel + vinyl label to the new image in sync
    if (artworkImg) artworkImg.style.opacity = "0";
    if (vinylLabel) vinylLabel.style.opacity = "0";
    setTimeout(() => {
      if (artworkImg) {
        artworkImg.src = newArtwork;
        artworkImg.style.opacity = "";
      }
      if (vinylLabel) {
        vinylLabel.src = newArtwork;
        vinylLabel.style.opacity = "";
      }
      if (lightboxImg) lightboxImg.src = newArtwork;
    }, 300);
  }

  // Build track list panel from albumConfig
  const listEl = document.getElementById("track-list");
  if (listEl) {
    const header = document.createElement("div");
    header.className = "track-list-header";
    const metaParts = [tracks.length + " tracks", year, label].filter(Boolean);
    header.innerHTML = `
      <div class="album-artist">${artist}</div>
      <div class="album-name">${title}</div>
      <div class="album-count">${metaParts.join(" · ")}</div>
    `;
    listEl.appendChild(header);

    const table = document.createElement("div");
    table.className = "track-table";

    tracks.forEach((track, i) => {
      const a = document.createElement("a");
      a.href = "#";
      a.className = "track-item";
      a.dataset.id = track.id;

      const num = document.createElement("span");
      num.className = "track-num";
      num.textContent = String(i + 1).padStart(2, "0");

      const name = document.createElement("span");
      name.className = "track-name";
      name.textContent = track.title;

      a.appendChild(num);
      a.appendChild(name);

      a.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveTrack(track.id);
        crossfadeBackground(track.artwork || artwork);
        if (player.pauseState !== "reset") {
          player.run(track, () => player.play());
        } else {
          player.run(track);
        }
      });

      table.appendChild(a);
    });

    listEl.appendChild(table);

    // Move FX section into the track list panel (it lives in artwork-column in HTML)
    const fxEl = document.querySelector(".fx-section");
    if (fxEl) listEl.appendChild(fxEl);
  }

  function setActiveTrack(id) {
    if (!listEl) return;
    listEl.querySelectorAll(".track-item").forEach((el) => {
      el.classList.toggle("is-playing", el.dataset.id === id);
    });
  }

  // Bootstrap navbar hamburger toggle (no Bootstrap JS needed)
  document.querySelectorAll('[data-toggle="collapse"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.querySelector(btn.dataset.target);
      if (target) target.classList.toggle("in");
    });
  });

  // Load initial track (from ?id= param or first track)
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const initial = tracks.find((t) => t.id === id) || tracks[0];
  setActiveTrack(initial.id);
  player.run(initial);

  // Auto-advance to next track after 3s gap
  player.onEnded = () => {
    const idx = tracks.findIndex((t) => t.url === player.trackInfo.url);
    if (idx > -1 && idx + 1 < tracks.length) {
      const next = tracks[idx + 1];
      setTimeout(() => {
        setActiveTrack(next.id);
        crossfadeBackground(next.artwork || artwork);
        player.run(next, () => player.play());
      }, 3000);
    }
  };
});
