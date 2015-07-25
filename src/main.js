/* global AV */
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
