var dsputil = require('./dsputil');
module.exports = {

    /**
     * How detailed to draw the resolution
     * 1 = highest resolution
     * 5 = medium
     */
    resolution: 1,
	
	/**
	 * size of inner label relative to overallSize
	 */
	innerLabelSize: 0.222, //roughly vinyl dimensions
	
	
	/** gap between signals in spiral
     * 1 = max gap (no wave)
     * 0 = no gap (smushed together waves)
	 */
	gap: 0.1,
	
	/**
	 * Increase quieter signals
	 * 1 = max (everything max)
	 * 0 = no change
	 */
	signalFattening: 0.2,

	/**
	 * Convert signal to svg
	 */
	signalToSpiral: function (signals, duration, title) {
		debugger;
		var me = this;
		var size = 1000;
		var totalTurns = me.calculateTurns(duration, size);
		//draw outline circles
		var path = me.drawWaveSpiral(totalTurns, signals, duration, size);
		//create svg
		//header
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
		//add height/width
		svg += ' width="100%" height="100%" ';
		//add size
		svg += ' viewBox="0 0 ' + size + ' ' + size; 
		//end svg element
		svg += '">';
		//title
		svg += '<title>' + title + '</title>';
		//path
		svg += '<path fill="rgba(166, 73, 179, 0.63)" stroke-width="1" stroke="black"';
		//id
		svg += ' id = "' + 'sp' + '" ';
		svg += 'd="' + path + '"/>';
		//circle
		var innerLabelRadius = me.calculateInnerLabelRadius(size, totalTurns);
		svg += '<circle cx="500" cy="500" id ="pausestart" r="' + innerLabelRadius + '"/>'
		
		//end
		svg += '</svg>';
		return svg;
	},
	
	/**
	 * Calculate size of inner label. Dependent on gapAmp and totalTurns
	 * @private
	 */
	calculateInnerLabelRadius: function(size, totalTurns) {
		var me = this;
		var outerRadius = size * 0.5;
		var gapAmplification = (1 - me.gap) * 0.5;		
		var innerRadius = outerRadius * me.innerLabelSize;
		innerRadius -= ((outerRadius - (outerRadius * me.innerLabelSize)) / totalTurns) 
				       * gapAmplification;
		return innerRadius;
	},
	
	/**
	 * Arbitrary turn calculator, essentially want
	 * majority of signals to be around 3-6
	 */
	calculateTurns: function(duration, size) {
		var maxTurns = 10;
		var minTurns = 2;
		var minutesAtMax = 60;
		//use tanh . Grows quickly from 0 but limits to 1 at x = 2
		var mDur = duration / 60000; // ms -> minutes
		var turns = Math.tanh(mDur * 2 / minutesAtMax) * 
				    (maxTurns - minTurns) + minTurns;
		console.log(duration / 60000 + ' : ' + turns);
		return Math.round(turns);
	},

	/**
	 * Create SVG pathcode of wave spiral
	 * @private
	 */
	drawWaveSpiral: function (totalTurns, signals, duration, size) {
		var me = this;
		var origin = [size * 0.5, size * 0.5];
		var outerRadius = size * 0.5;
		var gapAmplification = (1 - me.gap) * 0.5;		
		//reduce outer radius to account for maximum amplification
		outerRadius -= ((outerRadius - (outerRadius * me.innerLabelSize)) / totalTurns) 
				       * gapAmplification;
		var innerRadius = outerRadius * me.innerLabelSize; //roughly 45rpm record dimensions
		var increasePerTurn = (outerRadius - innerRadius) / totalTurns;
		//rough guess for how big we want signal to be
		var amplification = increasePerTurn * (gapAmplification);
		//general equation
		//r = a + bø
		var b = increasePerTurn / (2 * Math.PI);
		var lineLength = me.lengthOfSpiral(innerRadius, b, totalTurns);
		var scaleFactor = signals[0].length / ((outerRadius - innerRadius));
		//calculate length of spiral
		var tArray,
			r,
			orbit = Math.PI * 2 * totalTurns,
			signal = signals[0],
			disp,
			step,
			pathCode = '';			    
		//perform first loop
		for (var a = 0; a <= orbit; a += me.resolution * 0.01) {
			//calculate value
			step = ((orbit - a) / orbit) * lineLength;
			disp = me.calculateVal(signal, step, scaleFactor);
			//fatten up signal a bit
			disp = Math.pow(disp, 1 - me.signalFattening);
			r = innerRadius + (b * a) - (disp * amplification);
			tArray = me.polarToCart(r, a, origin);
			if (a === 0) {
				pathCode += 'M' + (tArray[0]) + ' ' + (tArray[1]) + ' ';
			} else {
				pathCode += 'L' + (tArray[0]) + ' ' + (tArray[1]) + ' ';
			}
		}
		//perform second loop. runs backwards.
		signal = signals[1];
		for (var a = orbit; a >= 0; a -= me.resolution * 0.01) {
			//calculate value
			step = ((orbit - a) / orbit) * lineLength;
			disp = me.calculateVal(signal, step, scaleFactor);
			//fatten signal
			disp = Math.pow(disp, 1 - me.signalFattening);
			r = innerRadius + (b * a) + (disp * amplification);
			//convert to cartesian
			tArray = me.polarToCart(r, a, origin);
			pathCode += 'L' + (tArray[0]) + ' ' + (tArray[1]) + ' ';
		}
		return pathCode + 'Z';
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


}
	
	


