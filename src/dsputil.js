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
		var ec = Math.ceil(end)
		for (var i = sf; i < ec && i < buffer.length; i++) {
			val = buffer[i];
			c += Math.abs(val);
		}
		return c / (end - start);
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
		for (var i = 0; i < buffer.length; i += channels) {
			for (var j = 0; j < channels; j++) {
				splitArray[j].push(buffer[i + j]);
			}
		}
		return splitArray;
	}

}