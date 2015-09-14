/*! waveformjs - v0.0.1 - 2015-09-14
* https://github.com/jonnywildey/waveformjs
* Copyright (c) 2015 Jonny Wildey; Licensed MIT */
/* global fft */
/* global AV */
/* global dsputil */
/* global $ */
var waveformjs = {

	audio: null,

	svgObj: null,

	pauseButton: null,

	waveSpiral: null,

	pauseState: null,

	playbackHead: null,

	imageInfo: null,
	
	hasPlayedBefore: false,
	
	trackInfo: false,

	/**
	 * Initialise
	 */
	init: function (id) {
		this.svgObj = Snap.select('#svg-' + id);
		this.waveSpiral = this.svgObj.select('#sp');
		this.pauseButton = this.svgObj.select('#pausebutton');
		this.playbackHead = this.svgObj.select('#playback-head')
		this.pauseButton.click(this.pauseClick.bind(this));
		this.pauseState = 'reset';
	},
	
	/**
	 * Play
	 */
	play: function () {
		var me = this;
		var i = 0;
		me.audio.play({
			whileplaying: function() {
				//too many whilePlaying events are fired
				i++;
				if (i % 10 == 0) {
					//sync
					me.animate('sync')
				}
			},
			onplay: function() {
				me.animate('play');
			}
		});
		this.pauseState = 'playing';
		this.pauseButton.addClass("playbutton");
		this.pauseButton.removeClass("pausebutton");
	},
	
	/**
	 * Pause
	 */
	pause: function () {
		this.audio.pause();
		//stop animation
		this.animate('pause');
		this.pauseState = 'paused';
		this.pauseButton.addClass("pausebutton");
		this.pauseButton.removeClass("playbutton");
	},

	/**
	 * When pause button is clicked
	 */
	pauseClick: function () {
		switch (this.pauseState) {
			case 'playing':
				this.pause();
				break;
			case 'paused':
			case 'loaded':
				this.play();
				break;
			case 'reset':
				this.loadAudio();
			case 'loading':
			//do nothing
			break;
		}
	},

	/**
	 * Animate (or stop animating) the svg
	 */
	animate: function (state) {
		var duration = this.audio.duration,
		    position = this.audio.position,
			totalTurns = this.imageInfo.totalTurns * 360,
			size = this.imageInfo.size,
			transition = 100;
		var hSize = size * 0.5;
		//relative distance to where head should eventually end
		var headShift = hSize - (this.imageInfo.innerLabelRadius * 3);
		//calculate current angle
		var progress = (position / duration);
		var currentAngle = progress * totalTurns,
			currentDistance = progress * headShift,
			msDur = (duration - position); //ms	
		switch (state) {
			case 'play':
				this.animateObjects(totalTurns, headShift, hSize,  msDur);
				break;
			case 'pause':
				this.animateObjects(currentAngle, currentDistance, hSize, transition);
				break;
			case 'sync':
				this.transformObjects(currentAngle, currentDistance, hSize);
				this.animateObjects(totalTurns, headShift, hSize,  msDur);
				break;
		}
	},
	
	/**
	 * Animate objects
	 */
	animateObjects: function(wAngle, pDistance, centre, duration) {
		this.waveSpiral.stop().animate(
			{ transform: 'r' + wAngle + ',' + centre + ',' + centre },
			duration);
		this.playbackHead.stop().animate(
			{ transform: 't-' + pDistance + ',0' },
			duration
			);
	},
	
	/**
	 * Transform objects
	 */
	transformObjects: function(wAngle, pDistance, centre) {
		this.waveSpiral.stop().transform('r' + wAngle + ',' + centre + ',' + centre);
		this.playbackHead.stop().transform('t-' + pDistance + ',0' );
	},
	
	/**
	 * load audio
	 */
	loadAudio: function() {
		var me = this;
		me.pauseState = 'loading';
		me.svgObj.addClass('loading');
		$('#track-title').html('loading');
		var suspendFunction = function() {
			if (me.pauseState === 'loading') {
				me.svgObj.removeClass('loading');
				me.pauseState = 'loaded';
				$('#track-title').html(me.trackInfo.title);
			}
		}
		me.audio.load({
			onsuspend: suspendFunction,
			whileloading: function() {
				if (me.pauseState === 'loading' && me.audio.bytesLoaded > 0.2) {
					suspendFunction();
				}
			}
		});	
		
	},


	run: function (id, sound, wav, trackInfo) {
		var divId = $('#' + id);
		this.trackInfo = trackInfo;
		//get smaller of height or width
		var bHeight = $('body').height() * 0.9;
		var length = (divId.width() > bHeight) ? bHeight : divId.width();
		divId.height(length);
		//create objects
		var playerDiv = $('<div/>', {
			'class': 'spiral-player',
			'height': length,
			'width': length,
		});
		$('<object id="svg-' + id + '"class="svg-object" type="image/svg+xml" data="/~Jonny/waveformjs/svg/' + wav +
			'.svg"></object>').appendTo(playerDiv);
		playerDiv.appendTo(divId);
		

		$.getJSON('json/' + wav + '.json', function (data) {
			this.imageInfo = data;		
			//setup audio
			var obj = document.getElementById("svg-" + id);
			obj.addEventListener('load', function () {
				this.init(id);
				this.audio = sound;
				this.loadAudio();
			}.bind(this));
		}.bind(this));
	}
};



function Waveformjs() {
	return $.extend({}, waveformjs)
};


$(function(){
	// Wait for SoundManager2 to load properly
	soundManager.onready(function() {
		var tracks = {
			'fornia.wav': '/tracks/78067275',
			'atomic.wav': '/tracks/206005379'
			
		};
		var clientId = '84a4cf04866f2c6ce3cde18d76be4898';
		SC.initialize({
		client_id: clientId
			
		});;
		
		SC.get("/users/alphabetsheaven/tracks", function(tracks) {	
			var track = tracks[0];
			//create url
			var url = track.stream_url;
			(url.indexOf("secret_token") == -1) ? url = url + '?' : url = url + '&';
			url = url + 'client_id=' + clientId;
			
			var sound = soundManager.createSound({
					// Give the sound an id and the SoundCloud stream url we created above.
					id: track.id,
					url: url
				});
			var lw = new Waveformjs();
			lw.run('long', sound, 'atomic.wav', track);
			
		});
	});
});

