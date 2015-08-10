/* global fabric */
var drawsignal = {

	/**
	 * Canvas to draw
	 */
	canvas: null,

	/**
	 * Basic path settings
	 */
	pathSettings: { fill: 'blue', stroke: 'green', opacity: 0.5, fillRule: 'evenodd', selectable: false },
	
	/**
	 * Basic path settings
	 */
	insideCircleSettings: { fill: 'white', stroke: 'grey', opacity: 0.45, fillRule: 'evenodd', selectable: false },
	
	/**
	 * Basic path settings
	 */
	spiralPlayheadSettings: { fill: 'red', stroke: '', opacity: 0.25, width: 30, height: 30,  selectable: false},
	
	/**
	 * Settings for an outline
	 */
	outlineSettings: { fill: '', stroke: 'grey', opacity: 0.5, selectable: false },
	
	/**
     * playback line added to canvas
     */
    playbackLine: null, 
	
	/**
	 * Player
	 */
	player: null,
    
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
	setupCanvas: function (canvas, player) {
		fabric.Object.prototype.originX = fabric.Object.prototype.originY = 'center';
		this.canvas = canvas;
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.canvas = new fabric.Canvas('canvas');
		this.player = player;
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
		//waveWidth = (waveWidth) ? waveWidth : 100;
		var canvas = me.canvas, height = canvas.height, width = canvas.width;
		var centre = [width * 0.5, height * 0.5];
		var maxLength = (height > width) ? centre[0] : centre[1];
		//var maxRadius = Math.pow(Math.pow(maxLength, 2) * 0.5, 0.5);
		//turn every 1:00 or so
		var totalTurns = Math.round(duration / 80000);
		totalTurns = (totalTurns < 1) ? 1 : totalTurns;
		var innerRadius = maxLength / 5;
		//draw outline circles
		me.drawWaveSpiral(centre, innerRadius, (maxLength * 0.9),
			totalTurns, signals, duration);
	},

	/**
	 * Draw spiral
	 */
	drawSpiral: function (origin, innerRadius, outerRadius, totalTurns, signals, duration) {
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

		var pWidth = path.getWidth();
		var pHeight = path.getHeight();
		var max = (pWidth > pHeight) ? pWidth : pHeight;
		
		var group = new fabric.Group([path], {
			left: origin[0],
			top: origin[1],
			width: max,
			height: max
		});
		path.set({
			left: (pWidth - pHeight) * 0.5,
			top: (pHeight - pWidth) * 0.5
		});
		me.canvas.add(group);
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
			height: max,
			selectable: false
		});
		path.set({
			left: (pWidth - pHeight) * 0.5,
			top: (pHeight - pWidth) * 0.5
		});

		path.set(me.pathSettings);
		me.canvas.add(group);	
		//add circle
		me.drawCircle(origin, innerRadius , me.insideCircleSettings);
		me.drawPlaybackTriangle(innerRadius, origin);
		
		//playback
		me.drawSpiralPlaybackLine(duration, outerRadius, 
								  innerRadius, totalTurns, origin, pWidth / pHeight);
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
	drawSpiralPlaybackLine: function (duration, outerRadius, innerRadius, totalTurns, origin, skew) {
		var me = this;
		var oldms = 1;
		var player = me.getPlayer();
		player.on('progress', function (ms) {
			setTimeout(function () {
				me.writeSpiralPlaybackLine(ms, duration, oldms, outerRadius, 
											innerRadius, totalTurns, origin, skew);
				oldms = ms;
			}, me.playbackDelay * 2);
		});
	},
	
	drawPlaybackTriangle: function(radius, origin) {
		var innerRadius = radius * 0.5;
		var me = this;
		var triangle = new fabric.Triangle({ 
			fill: '', 
			stroke: 'grey', 
			opacity: 0.65, 
			width: innerRadius, 
			height: innerRadius, 
			left: origin[0],
			top: origin[1],
			angle: 90 });
		triangle.on('selected', function() {
			me.player.play();
			me.canvas.remove(triangle);
			me.drawPlaybackPause(radius, origin);
		});		
			
		this.canvas.add(triangle);
	},
	
	drawPlaybackPause: function(radius, origin) {
		var innerRadius = radius * 0.5;
		var me = this;
		var r1 = new fabric.Rect({ 
			fill: '', 
			stroke: 'grey', 
			opacity: 0.65, 
			width: innerRadius * 0.2, 
			height: innerRadius, 
			left: 0,
			top: 0});
			
		var r2 = new fabric.Rect({ 
			fill: '', 
			stroke: 'grey', 
			opacity: 0.65, 
			width: innerRadius * 0.2, 
			height: innerRadius, 
			left: innerRadius * 0.5,
			top: 0});
			
		var group = new fabric.Group([r1, r2], {
			width: innerRadius, 
			height: innerRadius, 
			left: origin[0],
			top: origin[1]
		});
		group.on('selected', function() {
			me.player.pause();
			me.canvas.remove(group);
			me.drawPlaybackTriangle(radius, origin);
		});		
		this.canvas.add(group);
	},
	
	
	/**
	 * Draw a playback line based on play progress updates. 
	 * Smoothly animate line by assuming next progress update will occur
	 * in roughly the same interval as the previous
	 * @private
	 */
	writeSpiralPlaybackLine: function (ms, duration, oldms, outerRadius, 
									   innerRadius, totalTurns, origin, skew) {
		var me = this, canvas = this.canvas;
		//get rid of last playback line
		canvas.remove(me.playbackLine);
		//var mid = (1 - (ms / duration)) * ((outerRadius - innerRadius) / (totalTurns * 8));
		var progress = (ms / duration) * (outerRadius - innerRadius);
		//var angle = (ms / duration) * totalTurns * 2 * Math.PI;
		//create playback
		var cCords = me.polarToCart(outerRadius - progress, 0, origin);
		var triangle = new fabric.Triangle($.extend({
			left: cCords[0], top: cCords[1] 
		}, me.spiralPlayheadSettings));
		me.playbackLine = triangle;
		//guess rate of events
		var msdif = ms - oldms;
		var pixelWidth = (msdif / duration) * (outerRadius - innerRadius);
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
			}, me.playbackDelay + (duration * 0.0003));
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