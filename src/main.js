/* global fft */
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
