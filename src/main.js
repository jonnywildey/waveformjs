/* global Snap */
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

	divId: null,

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

	getTrackInfo: function () {
		return this.trackInfo;
	},

	/**
	 * Play
	 */
	play: function () {
		var me = this;
		var i = 0;
		me.audio.play({
			whileplaying: function () {
				//too many whilePlaying events are fired
				i++;
				if (i % 10 == 2) {
					//sync
					me.animate('sync')
				}
			},
		});
		me.animate('play');
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
				this.animateObjects(totalTurns, headShift, hSize, msDur);
				break;
			case 'pause':
				this.animateObjects(currentAngle, currentDistance, hSize, transition);
				break;
			case 'sync':
				this.transformObjects(currentAngle, currentDistance, hSize);
				this.animateObjects(totalTurns, headShift, hSize, msDur);
				break;
		}
	},

	/**
	 * Animate objects
	 */
	animateObjects: function (wAngle, pDistance, centre, duration) {
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
	transformObjects: function (wAngle, pDistance, centre) {
		this.waveSpiral.stop().transform('r' + wAngle + ',' + centre + ',' + centre);
		this.playbackHead.stop().transform('t-' + pDistance + ',0');
	},

	/**
	 * load audio
	 */
	loadAudio: function () {
		var me = this;
		me.pauseState = 'loading';
		me.svgObj.addClass('loading');
		$('#track-title').html('loading');
		var suspendFunction = function () {
			if (me.pauseState === 'loading') {
				me.svgObj.removeClass('loading');
				me.pauseState = 'loaded';
				$('#track-title').html(me.trackInfo.title);
			}
		}
		me.audio.load({
			onsuspend: suspendFunction,
			whileloading: function () {
				if (me.pauseState === 'loading' && me.audio.bytesLoaded > 0.2) {
					suspendFunction();
				}
			}
		});

	},

	clear: function () {
		if (this.divId != null) {
			this.divId.empty();
		}
	},

	stop: function () {
		if (this.audio != null) {
			this.audio.stop();
		}
	},

	createHtml: function (id, trackInfo) {
		this.divId = $('#' + id);
		this.trackInfo = trackInfo;
		//get smaller of height or width
		// var bHeight = $('body').height() * 0.9;
		// var length = (this.divId.width() > bHeight) ? bHeight : this.divId.width();
		// this.divId.height(length);
		//create objects
		var playerDiv = $('<div/>', {
			'class': 'spiral-player',
			// 'height': length,
			// 'width': length,
		});
		$('<object id="svg-' + id + '"class="svg-object" type="image/svg+xml" data="svg/' + trackInfo.svgId +
			'.svg"></object>').appendTo(playerDiv);
		playerDiv.appendTo(this.divId);
	},


	run: function (id, sound, trackInfo) {
		this.clear();
		this.stop();
		this.createHtml(id, trackInfo);
		$.getJSON('json/' + trackInfo.svgId + '.json', function (data) {
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

var clientId = '84a4cf04866f2c6ce3cde18d76be4898';
var lw = new Waveformjs();



function playSound(id) {
	//find sound
	var sound;
	scData.some(function (track) {
		if (track.id == id) {
			sound = track;
			return true;
		}
	});
	playAudio(sound);
}

function populateTrackTable(tracks) {
	//create tracks table
	var tStr = "";
	var tFormat = '<div class="track-item"><a href="#" onclick="playSound({1})">{0}</a></div>';
	tracks.forEach(function (track) {
		tStr += tFormat.format(track.title, track.id);
	});
	//add spacer
	tStr += ' <div class="track-item-spacer"></div>';
	$('#track-table').append(tStr);
}



function playAudio(track) {
	//check if already playing
	if (lw.getTrackInfo().id == track.id) {
		return;
	}
	//create url
	var url = track.stream_url;
	(url.indexOf("secret_token") == -1) ? url = url + '?' : url = url + '&';
	url = url + 'client_id=' + clientId;
	//create
	var sound = soundManager.createSound({
		// Give the sound an id and the SoundCloud stream url we created above.
		id: track.id,
		url: url
	});
	lw.run('long', sound, track);
}



$(function () {
	// Wait for SoundManager2 to load properly
	soundManager.onready(function () {
		SC.initialize({
			client_id: clientId

		});;

		//get all tracks with svgId
		var tracks = [];
		scData.forEach(function (track) {
			if (track.svgId !== undefined) { //check if file exists?
				tracks.push(track);
			}
		});
		populateTrackTable(tracks);

		//preload
		playAudio(tracks[0]);

	});
});
