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
	 * cfft in frames of size
	 */
	frameCfft: function(amplitudes, frameSize, sampleRate) {
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
	
	
	hertzToMel: function(hertz) {
	  var f = hertz * 0.00142857142857 + 1; //1 / 700
	  return 1127 * Math.log(f);
	},
	
	melToHertz: function(mel) {
		var f = (math.pow(10, mel * 0.00038535645472) -1) // 1 / 2595
		return f * 700;
	},
	
	getMelRow: function(sampleRate, frameSize) {
		var me = this;
		var freqRow = this.getFreqRow(sampleRate, frameSize);
		var melRow = [];
		freqRow.forEach(function(freq) {
			melRow.push(me.mel(freq));
		})
		return melRow;
	},
	
	
	/**
	 * Calculates the frequencies (in hertz) that we 
	 * would use for a mel filterbank
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
	 * Align frequencies to nearest fft bin
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
		var ff;
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
