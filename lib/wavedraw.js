
var AV = require('av');
require('mp3');
var drawsignal = require('./drawsignal');
var dsputil = require('./dsputil');

module.exports = {
        
    /**
     * data
     */
    asset: null,
      
    /**
     * setup
     */
    setup: function (audioFile) {
        //create asset from file
        this.asset = AV.Asset.fromURL(audioFile);
    },
    
    /**
     * Draw spiral waveform
     */
    drawSpiral: function (audioFile, callback) {
        var me = this;
        me.setup(audioFile);                    
        //when array has been decoded, analyze
        me.asset.decodeToBuffer(function (buffer) {
            var channels = me.asset.format.channelsPerFrame;
            var signals = dsputil.splitArraysByChannel(buffer, channels);
            var svg = drawsignal.signalToSpiral(signals, me.asset.duration, audioFile, callback);  
        });
    },
    
}
