/*! waveformjs - v0.0.1 - 2015-07-25
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

/* global dsputil */
/* global $ */
var waveformjs = {
    run: function (audioFile, canvas) {
        //set up canvas        
            drawsignal.setupCanvas(canvas);
            //create asset from file
            var asset = AV.Asset.fromURL(audioFile);
            //due to the constructor from asset being broken, create separate player.
            var player = AV.Player.fromURL(audioFile);
                      
            //create colors
            var strokeColors = [
                'hsl(260, 90%, 70%)',
                'hsl(200, 90%, 70%)',
                'hsl(160, 90%, 70%)',
                'hsl(100, 90%, 70%)',
                'hsl(70, 90%, 70%)',
                'hsl(60, 90%, 70%)',
                'hsl(40, 90%, 70%)',
                'hsl(20, 90%, 70%)',
            ];
            var fillColors = [
                'hsl(205, 80%, 30%)',
                'hsl(160, 80%, 30%)',
                'hsl(110, 80%, 30%)',
                'hsl(90, 80%, 30%)',
                'hsl(70, 80%, 30%)',
                'hsl(50, 80%, 30%)',
                'hsl(30, 80%, 30%)',
                'hsl(10, 80%, 30%)',
            ];
                            
            //when array has been decoded, analyze
            asset.decodeToBuffer(function (buffer) {
                debugger;
                drawAmplitudes(buffer);
                //drawFrequencies(buffer);
                                           
                //play
                player.play();

            });
                      
            //play when ready
            player.on('ready', function () {
                drawsignal.drawPlaybackLine(player, asset.duration)
            })
                      
            /**
             * draw the amplitudes of the wave
             */
            var drawAmplitudes = function (buffer) {
                var channels = asset.format.channelsPerFrame;
                //split into stereo signals
                var channelArray = dsputil.splitArraysByChannel(buffer, channels);
                      
                //draw signal
                channelArray.forEach(function (signal, i) {
                    //change colors
                    drawsignal.pathSettings.stroke = strokeColors[i % strokeColors.length];
                    drawsignal.pathSettings.fill = fillColors[i % fillColors.length];
                    //draw
                    drawsignal.signalToCanvas(signal, i % 2);
                });
            }

            drawFrequencies = function (buffer) {

                var channels = asset.format.channelsPerFrame;
                var sampleRate = asset.format.sampleRate;
                var frameSize = 1024;
                //split into stereo signals
                var channelArray = dsputil.splitArraysByChannel(buffer, channels);
                //just use left channel for now
                var complexArray = fft.toComplex(channelArray[0]);
                var ffts = fft.frameCfft(complexArray, frameSize, sampleRate);
                debugger;
                for (var k = 0; k < 5; k++) {
                    var bassArray = [];
                    for (var i = 0; i < ffts.length; i++) {
                        for (var j = 0; j < frameSize; j++) {
                            bassArray.push(ffts[i][k]);
                        }
                    }
                    debugger;
                    drawsignal.pathSettings.stroke = strokeColors[k % strokeColors.length];
                    drawsignal.pathSettings.fill = fillColors[k % fillColors.length];
                    drawsignal.signalToCanvas(bassArray, true);
                }
                debugger;



            }



    }
}
