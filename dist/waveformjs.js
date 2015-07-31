/*! waveformjs - v0.0.1 - 2015-07-31
* https://github.com/jonnywildey/waveformjs
* Copyright (c) 2015 Jonny Wildey; Licensed MIT */
var drawsignal = {

	/**
	 * Canvas to draw
	 */
	canvas: null,

	/**
	 * Basic path settings
	 */
	pathSettings: { fill: 'blue', stroke: 'green', opacity: 0.5, fillRule: 'evenodd' },
	
	/**
	 * Basic path settings
	 */
	insideCircleSettings: { fill: 'white', stroke: 'grey', opacity: 0.45, fillRule: 'evenodd' },
	
	/**
	 * Basic path settings
	 */
	spiralPlayheadSettings: { fill: 'red', stroke: '', opacity: 0.25, width: 30, height: 30,  },
	
	/**
	 * Settings for an outline
	 */
	outlineSettings: { fill: '', stroke: 'grey', opacity: 0.5 },
	
	/**
     * playback line added to canvas
     */
    playbackLine: null, 
    
    /**
     * delay in ms for playback line
     */
    playbackDelay: 160,
    
    /**
     * How detailed to draw the resolution
     * 1 = highest resolution
     * 5 = medium
     */
    resolution: 1,
	
	/**
	 * Linear easing function
	 */
	linearEasing: function (t, b, c, d) { return c * t / d + b; },
	
	/**
	 * colors for wave strokes
	 */
	strokeColors: [
		'hsl(260, 90%, 70%)',
		'hsl(200, 90%, 70%)',
		'hsl(160, 90%, 70%)',
		'hsl(100, 90%, 70%)',
		'hsl(70, 90%, 70%)',
		'hsl(60, 90%, 70%)',
		'hsl(40, 90%, 70%)',
		'hsl(20, 90%, 70%)',
    ],
	
	/**
	 * colors for wave fill
	 */
	fillColors: [
		'hsl(205, 80%, 30%)',
		'hsl(160, 80%, 30%)',
		'hsl(110, 80%, 30%)',
		'hsl(90, 80%, 30%)',
		'hsl(70, 80%, 30%)',
		'hsl(50, 80%, 30%)',
		'hsl(30, 80%, 30%)',
		'hsl(10, 80%, 30%)',
    ],

    
    /**
	 * Setup canvas
	 */
	setupCanvas: function (canvas) {
		fabric.Object.prototype.originX = fabric.Object.prototype.originY = 'center';
		this.canvas = canvas;
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.canvas = new fabric.Canvas('canvas');
		//add removeAll
		canvas.removeAll = function () {
			var items = canvas.getObjects();
			items.forEach(function (item) {
				canvas.remove(item);
			});
		}
	},
	
	/**
	 * player
	 * @private
	 */
	_player: null,
	
	/**
	 * Set player
	 */
	setPlayer: function (player) {
		this._player = player;
	},
	
	/**
	 * get player
	 */
	getPlayer: function () {
		return this._player;
	},
	
	/**
	 * Draws a waveform in a circle
	 */
	signalToCircle: function (signals, duration, waveWidth) {
		var me = this;
		waveWidth = (waveWidth) ? waveWidth : 100;
		var canvas = me.canvas, height = canvas.height, width = canvas.width;
		var centre = [width * 0.5, height * 0.5];
		var maxLength = (height > width) ? centre[0] : centre[1];
		var maxRadius = Math.pow(Math.pow(maxLength, 2) * 0.5, 0.5);
		//draw outline circles
		me.drawCircle(centre, maxRadius);
		me.drawCircle(centre, maxRadius - waveWidth);
		//draw main circle
		me.drawWaveCircle(centre, maxRadius - (waveWidth * 0.5), signals,
			waveWidth, duration);
		//draw playback line
		var coords = [centre[0], 0, centre[0], Math.pow(2 * Math.pow(waveWidth, 2), 0.5)];
		me.playbackLine = new fabric.Line(coords, me.outlineSettings);
		me.canvas.add(me.playbackLine);
	},
	
	
	

	/**
	 * Draw a basic circle
	 */
	drawCircle: function (origin, radius, pathSettings) {
		var me = this;
		pathSettings = (pathSettings) ? pathSettings : me.outlineSettings; 
		//radius coordinates
		//r = a
		var pathCode = '';
		var tArray, orbit = Math.PI * 2;
		for (var a = 0; a < orbit; a += 0.01) {
			tArray = me.polarToCart(radius, a, origin);
			pathCode += 'L ' + (tArray[0]) + ' ' + (tArray[1]);
		}
		//end path on 0 so fill isn't at an angle
		tArray = me.polarToCart(radius, 0, origin);
		pathCode += 'L' + tArray[0] + ' ' + tArray[1];
		//draw
		var path = new fabric.Path(pathCode);
		path.set(pathSettings);
		this.canvas.add(path);
	},
	
	

	/**
	 * Draw wave circle
	 */
	drawWaveCircle: function (origin, radius, signals, amplitude, duration) {
		var me = this;
		//fit length of wave to circle
		var scaleFactor = signals[0].length / radius; 
		//radius coordinates (can't assume 0,0 at center)
		var rco = [origin[0] + radius, origin[1] + radius];
		//start creating svg path
		var pathCode = '';
		var angle, x, y, disp, dco;
		//for each side of the signal
		for (var j = 0; j < signals.length; j++) {
			for (var i = 0; i < radius; i += me.resolution) {
				//signal as displacement from the line
				disp = me.calculateVal(signals[j], i, scaleFactor);
				//change side
				disp = (j % 2) ? disp : disp * -1;
				dco = [rco[0] + (disp * amplitude), rco[1] + (disp * amplitude)];
				//work out angle. Wave naturally starts at 135° so shift
				angle = (Math.PI * 2) * (i / radius) - (Math.PI * 0.75);
				x = Math.cos(angle) * (dco[0] - origin[0]) -
				Math.sin(angle) * (dco[1] - origin[1]) + origin[0];
				y = Math.sin(angle) * (dco[0] - origin[0]) +
				Math.cos(angle) * (dco[1] - origin[1]) + origin[1];
				pathCode += 'L ' + x + ' ' + y;
			}
		}
		//draw path
		var path = new fabric.Path(pathCode);
		path.set(me.pathSettings);
		me.canvas.add(path);
		//rotate
		me.rotateWave(path, duration);
	},
	
	/**
	 * Rotate wave form
	 * @private
	 */
	rotateWave: function (path, duration) {
		var me = this;
		var oldms = 0, diff, angle;
		me.getPlayer().on('progress', function (ms) {
			//there's some amount of delay between these progress updates and the actual audio...
			setTimeout(function () {
				//our previous prediction will be off, factor this error into
				//next prediction so we stay in sync
				var drift = ((-path.angle / 360) * duration) - oldms;
				//adding all the drift in makes the rotation stuttery, make it smaller
				drift = (drift / duration * 360) * 0.5;
				angle = ((ms / duration) * 360) - drift;
				angle = (angle > 360) ? 360 : angle;
				diff = ms - oldms;
				path.animate('angle', '' + (-angle) + '', {
					onChange: me.canvas.renderAll.bind(me.canvas),
					duration: diff,
					//linear easing
					easing: me.linearEasing
				});
				oldms = ms;
			}, me.playbackDelay + (duration * 0.0005));
		});

		me.getPlayer().on('end', function () {
			path.animate('angle', '' + -360 + '', {
				onChange: me.canvas.renderAll.bind(me.canvas),
				duration: 100, //bit of leeway
				//linear easing
				easing: me.linearEasing
			});
		});
	},

	signalToSpiral: function (signals, duration, waveWidth) {
		var me = this;
		debugger;
		//waveWidth = (waveWidth) ? waveWidth : 100;
		var canvas = me.canvas, height = canvas.height, width = canvas.width;
		var centre = [width * 0.5, height * 0.5];
		var maxLength = (height > width) ? centre[0] : centre[1];
		//var maxRadius = Math.pow(Math.pow(maxLength, 2) * 0.5, 0.5);
		debugger;
		//turn every 1:00 or so
		var totalTurns = Math.round(duration / 80000);
		totalTurns = (totalTurns < 1) ? 1 : totalTurns;
		var innerRadius = maxLength / 5;
		//draw outline circles
		//me.drawSpiral(centre, innerRadius, maxLength, totalTurns);
		//me.drawSpiral(centre, maxLength - width);
		me.drawWaveSpiral(centre, innerRadius, (maxLength * 0.9),
			totalTurns, signals, duration);
		//me.drawCircle(centre, maxRadius - waveWidth);
		//rotate
		
	},

	/**
	 * Draw spiral
	 */
	drawSpiral: function (origin, innerRadius, outerRadius, totalTurns) {
		var me = this;
		var increasePerTurn = (outerRadius - innerRadius) / totalTurns;
		//general equation
		//r = a + bø
		var b = increasePerTurn / (2 * Math.PI);
		var tArray, r, orbit = Math.PI * 2 * totalTurns;
		var pathCode = ''
		for (var a = 0; a < orbit; a += 0.01) {
			r = innerRadius + (b * a);
			tArray = me.polarToCart(r, a, origin);
			pathCode += 'L ' + (tArray[0]) + ' ' + (tArray[1]);
		}
		//draw path
		var path = new fabric.Path(pathCode);
		path.set(me.outlineSettings);
		me.canvas.add(path);
		//add circle
		me.drawCircle(origin, innerRadius);
	},
	
	

	/**
	 * Draw wave in a spiral
	 */
	drawWaveSpiral: function (origin, innerRadius, outerRadius,
		totalTurns, signals, duration) {
		var me = this;
		var increasePerTurn = (outerRadius - innerRadius) / totalTurns;
		//rough guess for how big we want signal to be
		var amplification = increasePerTurn / ((totalTurns < 2) ? 2: totalTurns) * 0.2;
		//general equation
		//r = a + bø
		var b = increasePerTurn / (2 * Math.PI);
		var lineLength = me.lengthOfSpiral(innerRadius, b, totalTurns);
		//lineLength =  outerRadius;
		var resolution = 0.01;
		var scaleFactor = signals[0].length / ((outerRadius - innerRadius));
		//calculate length of spiral
		var tArray,
			r,
			orbit = Math.PI * 2 * totalTurns,
			signal = signals[0],
			disp,
			step,
			amp,
			pathCode = '';
		//perform first loop
		for (var a = 0; a <= orbit; a += resolution) {
			//calculate value
			step = ((orbit - a) / orbit) * lineLength;
			disp = me.calculateVal(signal, step, scaleFactor);
			amp = amplification / (a / orbit);
			r = innerRadius + ((b - (disp * amp)) * a);
			tArray = me.polarToCart(r, a, origin);
			pathCode += 'L ' + (tArray[0]) + ' ' + (tArray[1]);
		}
		//perform second loop
		signal = signals[1];
		for (var a = orbit; a >= 0; a -= resolution) {
			//calculate value
			step = ((orbit - a) / orbit) * lineLength;
			disp = me.calculateVal(signal, step, scaleFactor);
			amp = amplification / (a / orbit);
			r = innerRadius + ((b + (disp * amp)) * a);
			tArray = me.polarToCart(r, a, origin);
			pathCode += 'L ' + (tArray[0]) + ' ' + (tArray[1]);
		}
		//draw path
		var path = new fabric.Path(pathCode);
		//get width and height, reset path to origin
		var pWidth = path.getWidth();
		var pHeight = path.getHeight();
		var max = (pWidth > pHeight) ? pWidth : pHeight;
		var group = new fabric.Group([path], {
			left: origin[0],
			top: origin[1],
			width: max,
			height: max
		});
		debugger;
		path.set({
			left: (pWidth - pHeight) * 0.5,
			top: (pHeight - pWidth) * 0.5
		});

		path.set(me.pathSettings);
		me.canvas.add(group);	
		//add circle
		me.drawCircle(origin, innerRadius - (amplification * Math.PI), me.insideCircleSettings);
		//playback
		me.drawSpiralPlaybackLine(duration, outerRadius, innerRadius, totalTurns, origin);
		me.rotateSpiralWave(group, duration, totalTurns);
	},

	/**
	 * Convert polar to cartesian coordinates
	 */
	polarToCart: function (r, a, origin) {
		var cartesian = [];
		cartesian[0] = (r * Math.cos(a)) + origin[0];
		cartesian[1] = (r * Math.sin(a)) + origin[1];
		return cartesian;
	},
	
	/**
	 * Calculate length of spiral line
	 */
	lengthOfSpiral: function (a, b, numberOfTurns) {
		var toInt = function (a, b, t) {
			return Math.pow((Math.pow(a + b * t, 2) + Math.pow(b, 2)), 0.5);
		}
		return toInt(a, b, numberOfTurns * Math.PI * 2) - toInt(a, b, 0);
	},
	
	/**
	 * There is a delay in sending of playback events and playback
	 */
	drawSpiralPlaybackLine: function (duration, outerRadius, innerRadius, totalTurns, origin) {
		var me = this;
		var oldms = 1;
		var player = me.getPlayer();
		player.on('progress', function (ms) {
			setTimeout(function () {
				me.writeSpiralPlaybackLine(ms, duration, oldms, outerRadius, innerRadius, totalTurns, origin);
				oldms = ms;
			}, me.playbackDelay);
		});
	},
	
	/**
	 * Draw a playback line based on play progress updates. 
	 * Smoothly animate line by assuming next progress update will occur
	 * in roughly the same interval as the previous
	 * @private
	 */
	writeSpiralPlaybackLine: function (ms, duration, oldms, outerRadius, innerRadius, totalTurns, origin) {
		var me = this, canvas = this.canvas;
		//get rid of last playback line
		canvas.remove(me.playbackLine);
		var progress = (ms / duration) * (outerRadius - innerRadius);
		
		var cCords = me.polarToCart(outerRadius - progress, 0, origin);
		var triangle = new fabric.Triangle($.extend({
			left: cCords[0], top: cCords[1]
		}, me.spiralPlayheadSettings));
		me.playbackLine = triangle;
		//guess rate of events
		var msdif = ms - oldms;
		var pixelWidth = (msdif / duration) * (outerRadius - innerRadius);
		//me.playbackLine = new fabric.Line(coords, me.playbackSettings);
		me.canvas.add(me.playbackLine);
		//animate
		me.playbackLine.animate('left', '-=' + pixelWidth, {
			onChange: me.canvas.renderAll.bind(canvas),
			duration: msdif,
			//linear easing
			easing: me.linearEasing
		});
		oldms = ms;
	},
	
	/**
	 * Rotate wave form
	 * @private
	 */
	rotateSpiralWave: function (path, duration, turns) {
		var me = this;
		duration /= turns;
		var oldms = 0, diff, angle;
		me.getPlayer().on('progress', function (ms) {
			//there's some amount of delay between these progress updates and the actual audio...
			setTimeout(function () {
				//our previous prediction will be off, factor this error into
				//next prediction so we stay in sync
				var drift = ((path.angle / 360) * duration) - oldms;
				//adding all the drift in makes the rotation stuttery, make it smaller
				drift = (drift / duration * 360) * 0.5;
				angle = ((ms / duration) * 360) - drift;
				//angle = (angle > 360) ? 360 : angle;
				diff = ms - oldms;
				path.animate('angle', '' + angle + '', {
					onChange: me.canvas.renderAll.bind(me.canvas),
					duration: diff,
					//linear easing
					easing: me.linearEasing
				});
				oldms = ms;
			}, me.playbackDelay + (duration * 0.0005));
		});

		me.getPlayer().on('end', function () {
			path.animate('angle', '' + 360 + '', {
				onChange: me.canvas.renderAll.bind(me.canvas),
				duration: 100, //bit of leeway
				//linear easing
				easing: me.linearEasing
			});
		});
	},

	/**
	 * write signal to canvas
	 */
	signalToCanvas: function (signals, duration) {
		var me = this;
		var canvas = this.canvas;
		var height = canvas.height;
		var width = canvas.width;
		var amp = height * 0.5;
		var scaleFactor = signals[0].length / width;
	
		//write SVG path
		var val, bufInd, signal;
		for (var j = 0; j < signals.length; j++) {
			//for each signal
			var pathCode = 'M 0 ' + amp; //offset
			signal = signals[j];
			for (var i = 0; i < width; i += me.resolution) {
				bufInd = me.calculateVal(signal, i, scaleFactor);
				// flip based on stereo channel
				bufInd = (j % 2) ? bufInd : bufInd * -1;
				val = amp + (bufInd * height);
				pathCode += 'L ' + i + ' ' + val;
			}
			//end path on 0 so fill isn't at an angle
			pathCode += 'L' + width + ' ' + amp;
			//draw
			var path = new fabric.Path(pathCode);
			path.set(me.pathSettings);
			canvas.add(path);
		}

		//animate
		me.drawPlaybackLine(duration);
	},
	
	/**
	 * calculate drawing value 
	 * @private
	 */
	calculateVal: function (signal, i, scaleFactor) {
		var disp;
		if (scaleFactor > 1) { //more samples than space, average
			disp = Math.abs(dsputil.windowedAmplitude(signal, i * scaleFactor,
				(i + 1) * scaleFactor));
		} else { //more space than samples, interpolate
			disp = dsputil.interpolateBuffer(signal, i * scaleFactor);
		}
		return disp;
	},
	
	/**
	 * There is a delay in sending of playback events and playback
	 */
	drawPlaybackLine: function (duration) {
		var me = this;
		var oldms = 1;
		var player = me.getPlayer();
		player.on('progress', function (ms) {
			setTimeout(function () {
				me.writePlaybackLine(ms, duration, oldms);
				oldms = ms;
			}, me.playbackDelay);
		});
	},
	
	/**
	 * playback drawing settings
	 */
	playbackSettings: {
		fill: 'black',
		stroke: 'black',
		strokeWidth: 1,
		opacity: 0.85,
		selectable: false
	},
	
	/**
	 * Draw a playback line based on play progress updates. 
	 * Smoothly animate line by assuming next progress update will occur
	 * in roughly the same interval as the previous
	 * @private
	 */
	writePlaybackLine: function (ms, duration, oldms) {
		var me = this, canvas = this.canvas;
		//get rid of last playback line
		canvas.remove(me.playbackLine);

		var height = canvas.height;
		var width = canvas.width;
		var x = (ms / duration) * width;
		//vertical line
		var coords = [x, 0, x, height];
		//guess rate of events
		var msdif = ms - oldms;
		var pixelWidth = (msdif / duration) * width;

		me.playbackLine = new fabric.Line(coords, me.playbackSettings);
		me.canvas.add(me.playbackLine);
		//animate
		me.playbackLine.animate('left', '+=' + pixelWidth, {
			onChange: me.canvas.renderAll.bind(canvas),
			duration: msdif,
			//linear easing
			easing: me.linearEasing
		});
	}

}
var dsputil = {
	
	/**
	 * Treat buffer as continuous function and linearly interpolate
	 */
	interpolateBuffer: function(buffer, index) {
		var fi = Math.floor(index);
		var ci = Math.ceil(index);
		
		var d = index - fi;
		var floor = (buffer[fi]);
		var ceil = (buffer[ci]);
		
		var dif = ceil - floor;
		return dif + (ceil * d);
	},
	
	/**
	 * find the average absolute amplitude in a range
	 */
	averageAmplitude: function(buffer, start, end) {
		var c = 0;
		var val;
		var sf = Math.floor(start);
		var ec = Math.ceil(end);
		for (var i = sf; i < ec && i < buffer.length; i++) {
			val = buffer[i];
			c += Math.abs(val);
		}
		var result = c / (end - start);
		return result;	
	},
	
	/**
	 * count the amplitudes in the middle of the frame more
	 */
	windowedAmplitude: function(buffer, start, end) {
		var c = 0;
		var val;
		var sf = Math.floor(start);
		var ec = Math.ceil(end);
		var len = end - start;
		var hLen = len * 0.5;
		var amp;
		var pos;
		for (var i = sf; i < ec && i < buffer.length; i++) {
			val = buffer[i];
			pos = i - sf;
			amp = (pos < hLen) ? pos / hLen : (pos - hLen) / hLen;
			c += Math.abs(val) * amp;
		}
		var result = c / hLen;
		return result;		
	},
	
	/**
	 * separate a stereo (or greater number of channels)
	 * signal array into separate arrays
	 */
	splitArraysByChannel: function(buffer, channels) {
		var splitArray = [];
		//init
		for (var i = 0; i < channels; i++) {
			splitArray[i] = [];
		}
		//split
		for (var i = 0; i < channels; i++) {
			for (var j = 0; j < buffer.length - 1; j++) {
				splitArray[i].push(buffer[j + i]);
			}
		}
		return splitArray;
	}

}
var fft = {
	/**
	 * Converts simple array to complex array
	 */
	toComplex: function(numberArray) {
		var complexArray = [];
		numberArray.forEach(function(n) {
			complexArray.push(math.complex(n));
		});
		return complexArray;
	},
	/**
	 * complex exponential
	 */
	complexExp: function(cn) {
		var er = Math.exp(cn.re);
		var nc = math.complex({re: Math.cos(cn.im), im: er * Math.sin(cn.im)});
		return nc;
	},
	/**
	 * complex multiply: a * b
	 */
	complexMultiply: function(a, b) {
		return math.complex({re: a.re * b.re - a.im * b.im,
							im: a.im * b.re + a.re * b.im});
	},
	/**
	 * complex add: a + b
	 */
	complexAdd: function(a, b) {
		return math.complex({re: a.re + b.re, im: a.im + b.im});
	},
	/**
	 * complex subtract: a - b
	 */
	complexSubtract: function(a, b) {
		return math.complex({re: a.re - b.re, im: a.im - b.im});
	},
	
	complexAbs: function(a) {
		return Math.pow((a.re * a.re) + (a.im * a.im), 2);
	},
	
	/**
	 * perform fft transform on a signal
	 */
	fftTransform: function(amplitudes, frameSize, sampleRate) {
		if (!this.is2Exp(frameSize)) {
			return;
		}
		var frames = [];
		var frame;
		for (var i = 0; i < amplitudes.length - frameSize; i += frameSize) {
			frame = this.cfft(amplitudes.slice(i, i + frameSize));
			frames.push(this.normalise(frame));
		}
		return this.createMelWindow(frames, 26, frameSize, sampleRate);
	},
	
	/**
	 * perform mel-cepstrum transform
	 */
	melCepstrumTransfrom: function(amplitudes, frameSize, melBinCount, sampleRate) {
		var ffts = this.fftTransform(amplitudes, frameSize, sampleRate);
		return this.createMelWindow(ffts, melBinCount, frameSize, sampleRate);
	},
	
	
	/**
	 * complex fft function
	 * frame (amplitudes.length) has to be 2^n
	 */
	cfft: function(amplitudes) {
		//debugger;
		var me = this;
		var bigN = amplitudes.length;
		if (bigN <= 1) {//base case
			return amplitudes;
		}
		var halfN = bigN * 0.5;
		var evens = [];
		var odds = [];
		for (var i = 0; i < halfN; i++) {
			evens[i] = amplitudes[i * 2];
			odds[i] = amplitudes[i * 2 + 1];
		}
		evens = me.cfft(evens);
		odds = me.cfft(odds);
		
		var a = -2 * Math.PI;
		//combine
		for (var i = 0; i < halfN; i++) {
			var p = i / bigN;
			var t = me.complexExp(math.complex({re: 0, im: a * p}));
			t = me.complexMultiply(t, odds[i]);
			amplitudes[i] = me.complexAdd(t, evens[i]);
			amplitudes[i + halfN] = me.complexSubtract(evens[i], t);
		}
		return amplitudes;
	},
	
	/**
	 * Is value 2^x?
	 */
	is2Exp: function(n) {
		if (n === 1) {
			return true;
		}
		if (math.floor(n) !== n) {
		 	return false;
		}//decimal
		return this.is2Exp(n / 2);
	}, 
	
	/**
	 * DCT transform
	 */
	dct: function(frame) {
		debugger;
		var e;
		var dct = [];
		var len = frame.length;
		for (var i = 0; i < len; i++) {
			e = Math.pow(Math.E, -1 * i * Math.PI) /
			    len * 2;
			dct[i] = e * frame[i];
		}
		return dct;
	},
	
	
	/**
	 * returns the frequencies represented by fft
	 * based on sample rate
	 */
	getFreqRow: function(sampleRate, frameSize) {
		var sr = sampleRate / frameSize;
		var fr = []
		for (var i = 0; i < frameSize / 2; i++) {
			fr[i] = i * sr;
		}
		return fr;
	},
	
	/**
	 * hertz to mels
	 */
	hertzToMel: function(hertz) {
	  var f = hertz * 0.00142857142857 + 1; //1 / 700
	  return 1127 * Math.log(f);
	},
	
	/**
	 * mel to hertz
	 */
	melToHertz: function(mel) {
		var f = (math.pow(10, mel * 0.00038535645472) -1) // 1 / 2595
		return f * 700;
	},
	
	
	/**
	 * Calculates the frequencies (in hertz) that we 
	 * would be used for a mel filterbank
	 */
	createMelFilterBank: function(startFreq, endFreq, count) {
		var bank = [];
		var startMel = this.hertzToMel(startFreq);
		var endMel = this.hertzToMel(endFreq);
		var mel;
		var dif = (endMel - startMel) / count;
		for (var i = 0; i < count; i++) {
			//calculate linearly spaced in mels
			mel = startMel + dif * i;
			//convert back to hertz
			bank.push(this.melToHertz(mel));
		}
		return bank;
	},
	
	/**
	 * Align frequencies (from mel conversion) to nearest fft bin
	 */
	freqToBins: function(freqRows, frameSize, sampleRate) {
		var bins = [];
		var fPlus = frameSize + 1;
		freqRows.forEach(function(freq) {
			bins.push(Math.floor( fPlus *
							      (freq / sampleRate)) );
		});	
		return bins;
	},
	
	/**
	 * Basic window function. Linearly interpolates
	 * a frequency between fft bins
	 */
	windowFunction: function(i, bins, linRows, k) {
		var bl = linRows[bins[i - 1]];
		var bp = linRows[bins[i + 1]];
		var b =  linRows[bins[i]];
		
		if (k < bl) {
			return 0;
		} else 
		if (k < b) {
			return (k - bl) /
				   (b - bl);
		} else
		if (k < bp) {
			return (bp - k) /
				   (bp - b);
		} else {
			return 0;
		}	
	},
	
	/**
	 * run a frame of amplitudes through filter functions
	 */
	filterAmplitudes: function(frame, bins, linRows) {
		var melFrame = [];
		var oVal; //original value
		var fVal; //filter value
		for (var i = 0; i < frame.length; i++) {
			oVal = frame[i];
			fVal = 0;
			for (var j = 0; j < bins.length; j++) {
				//add each filter function's contribution
				fVal += oVal * (this.windowFunction(j, bins, linRows, linRows[i]));
			}
			//do powers
			fVal = Math.log(fVal);
			melFrame.push(fVal);
		}
		return melFrame;
	},

	/**
	 * Create mel-cepstrum bins from an fft signal
	 */
	createMelWindow: function(amplitudes, filterCount, frameSize, sampleRate) {
		debugger;
		var me = this;
		// create basic frequency row, removing the top half (as we did to the fft amps)
		var linRows = this.getFreqRow(sampleRate, frameSize);
		//create mel scaled frequency rows, using the first and last of the freqRows
		var melRows = this.createMelFilterBank(linRows[0], 
											   linRows[linRows.length - 1], 
											   filterCount);
		//determine which fft bin is closest to the mel frequency
		var melBins = this.freqToBins(melRows, frameSize, sampleRate);
		//for each frame calculate amplitudes
		var melAmplitudes = [];
		var melFrame;
		//for each frame, filter
		amplitudes.forEach(function(frame) {
			melFrame = me.filterAmplitudes(frame, melBins, linRows);
			melFrame = me.dct(melFrame);
			melAmplitudes.push(melFrame);
		});
		return melAmplitudes;
	},
	
	/**
	 * Periodogram estimate of the power spectrum
	 * Removes the top half of the bins (reflected anyway)
	 */
	normalise: function(amplitudes) {
		var len = amplitudes.length;
		var halfLen = len * 0.5;
		
		var na = [] //non-imaginary number array
		for (var i = 0; i < halfLen; i++) {
			na[i] = Math.pow(this.complexAbs(amplitudes[i]), 2) / len;
		}
		return na;
	}
}

/* global AV */
/* global dsputil */
/* global $ */
var waveformjs = {
    
    /**
     * data
     */
    asset: null,
    
    /**
     * audio player. due to aurora bugs these have to be separate entities
     */
    player: null,
    
    
    /**
     * setup
     */
    setup: function (audioFile, canvas) {
        //set up canvas        
        drawsignal.setupCanvas(canvas);
        //create asset from file
        this.asset = AV.Asset.fromURL(audioFile);
        //due to the constructor from asset being broken, create separate player.
        this.player = AV.Player.fromURL(audioFile);
        this.player.volume = 20;
        drawsignal.setPlayer(this.player);
    },

    /**
     * Draw circular waveform
     */
    drawCircle: function (audioFile, canvas) {
        var me = this;
        me.setup(audioFile, canvas);                    
        //when array has been decoded, analyze
        me.asset.decodeToBuffer(function (buffer) {
            var channels = me.asset.format.channelsPerFrame;
            var signals = dsputil.splitArraysByChannel(buffer, channels);
            //          
            drawsignal.signalToCircle(signals, me.asset.duration, 100);  
            //play
            me.player.play();
        });
    },
    
    /**
     * Draw spiral waveform
     */
    drawSpiral: function (audioFile, canvas) {
        var me = this;
        me.setup(audioFile, canvas);                    
        //when array has been decoded, analyze
        me.asset.decodeToBuffer(function (buffer) {
            var channels = me.asset.format.channelsPerFrame;
            var signals = dsputil.splitArraysByChannel(buffer, channels);
            //          
            drawsignal.signalToSpiral(signals, me.asset.duration, 100);  
            //play
            me.player.play();
        });
    },
    
    /**
     * Draw classic waveform
     */
    drawWave: function (audioFile, canvas) {
        var me = this;
        me.setup(audioFile, canvas);                    
        //when array has been decoded, analyze
        me.asset.decodeToBuffer(function (buffer) {
            var channels = me.asset.format.channelsPerFrame;
            var signals = dsputil.splitArraysByChannel(buffer, channels);
            //          
            drawsignal.signalToSpiral(signals, me.asset.duration);  
            //play
            me.player.play();
        });
    },

    drawFrequencies: function (buffer) {
        var channels = asset.format.channelsPerFrame;
        var sampleRate = asset.format.sampleRate;
        var frameSize = 1024;
        //split into stereo signals
        var channelArray = dsputil.splitArraysByChannel(buffer, channels);
        //just use left channel for now
        var complexArray = fft.toComplex(channelArray[0]);
        var ffts = fft.frameCfft(complexArray, frameSize, sampleRate);
        for (var k = 0; k < 5; k++) {
            var bassArray = [];
            for (var i = 0; i < ffts.length; i++) {
                for (var j = 0; j < frameSize; j++) {
                    bassArray.push(ffts[i][k]);
                }
            }
            drawsignal.pathSettings.stroke = strokeColors[k % strokeColors.length];
            drawsignal.pathSettings.fill = fillColors[k % fillColors.length];
            drawsignal.signalToCanvas(bassArray, true);
        }
    }
}
