/* global fabric */
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
	drawCircle: function (origin, radius, asset) {
		//radius coordinates
		var rco = [origin[0] + radius, origin[1] + radius];
		var pathCode = 'M ' + rco[0] + ' ' + rco[1];
		var angle, x, y;
		for (var i = 0; i < radius; i += this.resolution) {
			//work out angle
			angle = (Math.PI * 2) * (i / radius);
			x = Math.cos(angle) * (rco[0] - origin[0]) -
			Math.sin(angle) * (rco[1] - origin[1]) + origin[0];
			y = Math.sin(angle) * (rco[0] - origin[0]) +
			Math.cos(angle) * (rco[1] - origin[1]) + origin[1];
			pathCode += 'L ' + x + ' ' + y;
		}
		//end path on 0 so fill isn't at an angle
		pathCode += 'L' + rco[0] + ' ' + rco[1];
		//draw
		var path = new fabric.Path(pathCode);
		path.set(this.outlineSettings);
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
		
		me.getPlayer().on('end', function() {
			path.animate('angle', '' + -360 + '', {
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
		opacity: 0.65,
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