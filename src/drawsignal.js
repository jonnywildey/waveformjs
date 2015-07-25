var drawsignal = {

	/**
	 * Canvas to draw
	 */
	canvas: null,

	/**
	 * Basic path settings
	 */
	pathSettings: {fill: 'blue', stroke: 'green', opacity: 0.5 },
	
	
	/**
     * playback line added to canvas
     */
    playbackLine: null, 
    
    /**
     * delay in ms for playback line
     */
    playbackDelay: 140,
    
    /**
     * How detailed to draw the resolution
     * 1 = highest resolution
     * 5 = medium
     */
    resolution: 1,
    
    /**
	 * Setup canvas
	 */
	setupCanvas: function(canvas) {
		this.canvas = canvas;
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.canvas = new fabric.Canvas('canvas');
		//add removeAll
		canvas.removeAll = function() {
			var items = canvas.getObjects();
			items.forEach(function(item) {
				canvas.remove(item);
			});
		}
	},


	/**
	 * write signal to canvas
	 */
	signalToCanvas: function(signal, side) {
		var canvas = this.canvas;
		var height = canvas.height;
		var width = canvas.width;
		var amp = height * 0.5;
		var scaleFactor = signal.length / width;
		
		//write SVG path
		var pathCode = 'M 0 ' + amp; //offset
		var val, bufInd;
		for (var i = 0; i < width; i += this.resolution) {
			if (scaleFactor > 1) { //more samples than space, average
				bufInd = dsputil.averageAmplitude(signal, i * scaleFactor, 
												  (i + 1) * scaleFactor);
			} else { //more space than samples, interpolate
				bufInd = dsputil.interpolateBuffer(signal, i * scaleFactor);
			}
			if (side) { 
				val = amp - (bufInd * height);
			} else { //flip
				val = amp + (bufInd * height);
			}
			pathCode += 'L ' + i + ' ' + val;
		}
		//end path on 0 so fill isn't at an angle
		pathCode += 'L' + width + ' ' + amp;
		//draw
		var path = new fabric.Path(pathCode);
		path.set(this.pathSettings);
		canvas.add(path);
	},
	
	
	
	/**
	 * There is a delay in sending of playback events and playback
	 */
	drawPlaybackLine: function(player, duration) {
		var me = this;
		var oldms = 1;
		player.on('progress', function(ms) {
			setTimeout(function() {
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
	writePlaybackLine: function(ms, duration, oldms) {
		var me = this;
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
			easing: function(t, b, c, d) { return c*t/d + b; }
		});
	}
	
}