/**
 * Utilities for dsp
 */
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