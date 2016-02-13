/*! waveformjs - v0.0.1 - 2016-02-13
* https://github.com/jonnywildey/waveformjs
* Copyright (c) 2016 Jonny Wildey; Licensed MIT */
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
		$('.track-title').html('loading');
		var suspendFunction = function () {
			if (me.pauseState === 'loading') {
				me.svgObj.removeClass('loading');
				me.pauseState = 'loaded';
				$('.track-title').html(me.trackInfo.title);
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

var scData = [{"kind":"track","id":206005379, "svgId": "atomic.wav", "created_at":"2015/05/18 08:14:58 +0000","user_id":83918,"duration":255449,"commentable":true,"state":"finished","original_content_size":67567112,"last_modified":"2015/05/18 08:14:59 +0000","sharing":"public","tag_list":"Beat NoBeat","permalink":"atomic-alphabets-heaven-segilola","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"Cold","title":"Atomic (Alphabets Heaven & Segilola)","description":"Year Four\n\nhttp://store.kingdeluxe.ca/album/year-four","label_name":null,"release":null,"track_type":null,"key_signature":null,"isrc":null,"video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/206005379","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/atomic-alphabets-heaven-segilola","artwork_url":"https://i1.sndcdn.com/artworks-000117175595-0fahne-large.jpg","waveform_url":"https://w1.sndcdn.com/OUgPYC6J8X5C_m.png","stream_url":"https://api.soundcloud.com/tracks/206005379/stream","playback_count":2730,"download_count":0,"favoritings_count":135,"comment_count":8,"attachments_uri":"https://api.soundcloud.com/tracks/206005379/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":191084254,"created_at":"2015/02/14 11:32:30 +0000","user_id":83918,"duration":210880,"commentable":true,"state":"finished","original_content_size":55777872,"last_modified":"2015/04/09 01:19:21 +0000","sharing":"public","tag_list":"","permalink":"whats-up","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"https://alphabetsheaven.bandcamp.com/album/lovers","label_id":null,"purchase_title":null,"genre":"Bass","title":"Whats Up","description":"https://alphabetsheaven.bandcamp.com/\r\n\r\nFor the lovers. \r\n\r\nSelection of some of the sleek and soulful edits. Share with a friend.","label_name":"","release":"","track_type":null,"key_signature":null,"isrc":null,"video_url":null,"bpm":null,"release_year":2015,"release_month":2,"release_day":14,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/191084254","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/whats-up","artwork_url":"https://i1.sndcdn.com/artworks-000106683903-0n2dh2-large.jpg","waveform_url":"https://w1.sndcdn.com/1KiSu4TxblcD_m.png","stream_url":"https://api.soundcloud.com/tracks/191084254/stream","playback_count":1554,"download_count":0,"favoritings_count":51,"comment_count":3,"attachments_uri":"https://api.soundcloud.com/tracks/191084254/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":191084253,"created_at":"2015/02/14 11:32:30 +0000","user_id":83918,"duration":284211,"commentable":true,"state":"finished","original_content_size":75180132,"last_modified":"2015/05/13 21:44:46 +0000","sharing":"public","tag_list":"","permalink":"angel","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"https://alphabetsheaven.bandcamp.com/album/lovers","label_id":null,"purchase_title":null,"genre":"Bass","title":"Angel","description":"https://alphabetsheaven.bandcamp.com/\r\n\r\nFor the lovers. \r\n\r\nSelection of some of the sleek and soulful edits. Share with a friend.","label_name":"","release":"","track_type":null,"key_signature":null,"isrc":null,"video_url":null,"bpm":null,"release_year":2015,"release_month":2,"release_day":14,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/191084253","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/angel","artwork_url":"https://i1.sndcdn.com/artworks-000106683903-0n2dh2-large.jpg","waveform_url":"https://w1.sndcdn.com/ESiQrwQcUHvl_m.png","stream_url":"https://api.soundcloud.com/tracks/191084253/stream","playback_count":1133,"download_count":0,"favoritings_count":20,"comment_count":2,"attachments_uri":"https://api.soundcloud.com/tracks/191084253/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track", "svgId":"adorn.wav", "id":191084251,"created_at":"2015/02/14 11:32:30 +0000","user_id":83918,"duration":240530,"commentable":true,"state":"finished","original_content_size":63623740,"last_modified":"2015/07/17 10:24:33 +0000","sharing":"public","tag_list":"","permalink":"adorn","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"https://alphabetsheaven.bandcamp.com/album/lovers","label_id":null,"purchase_title":null,"genre":"Bass","title":"Adorn","description":"https://alphabetsheaven.bandcamp.com/\r\n\r\nFor the lovers. \r\n\r\nSelection of some of the sleek and soulful edits. Share with a friend.","label_name":"","release":"","track_type":null,"key_signature":null,"isrc":null,"video_url":null,"bpm":null,"release_year":2015,"release_month":2,"release_day":14,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/191084251","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/adorn","artwork_url":"https://i1.sndcdn.com/artworks-000106683903-0n2dh2-large.jpg","waveform_url":"https://w1.sndcdn.com/z0E3sjYepb39_m.png","stream_url":"https://api.soundcloud.com/tracks/191084251/stream","playback_count":7676,"download_count":0,"favoritings_count":143,"comment_count":6,"attachments_uri":"https://api.soundcloud.com/tracks/191084251/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":191084250,"created_at":"2015/02/14 11:32:30 +0000","user_id":83918,"duration":230499,"commentable":true,"state":"finished","original_content_size":60968194,"last_modified":"2015/04/16 06:11:44 +0000","sharing":"public","tag_list":"","permalink":"all-the-time","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"https://alphabetsheaven.bandcamp.com/album/lovers","label_id":null,"purchase_title":null,"genre":"Bass","title":"All The Time","description":"https://alphabetsheaven.bandcamp.com/\r\n\r\nFor the lovers. \r\n\r\nSelection of some of the sleek and soulful edits. Share with a friend.","label_name":"","release":"","track_type":null,"key_signature":null,"isrc":null,"video_url":null,"bpm":null,"release_year":2015,"release_month":2,"release_day":14,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/191084250","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/all-the-time","artwork_url":"https://i1.sndcdn.com/artworks-000106683903-0n2dh2-large.jpg","waveform_url":"https://w1.sndcdn.com/H4Wa7aZypTmS_m.png","stream_url":"https://api.soundcloud.com/tracks/191084250/stream","playback_count":1367,"download_count":0,"favoritings_count":41,"comment_count":4,"attachments_uri":"https://api.soundcloud.com/tracks/191084250/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":190901632,"created_at":"2015/02/13 08:28:07 +0000","user_id":83918,"duration":268641,"commentable":true,"state":"finished","original_content_size":71059132,"last_modified":"2015/07/12 21:15:27 +0000","sharing":"public","tag_list":"","permalink":"sex-you","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"https://alphabetsheaven.bandcamp.com/album/lovers","label_id":null,"purchase_title":"Free EP @ Bandcamp","genre":"Bass","title":"Sex You","description":"For the lovers. \n\nSelection of some of the sleek and soulful edits. Share with a friend.\n\n","label_name":null,"release":null,"track_type":null,"key_signature":null,"isrc":null,"video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/190901632","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/sex-you","artwork_url":"https://i1.sndcdn.com/artworks-000106559087-xxkmdx-large.jpg","waveform_url":"https://w1.sndcdn.com/CjOyaSeWgDb9_m.png","stream_url":"https://api.soundcloud.com/tracks/190901632/stream","playback_count":2330,"download_count":0,"favoritings_count":73,"comment_count":4,"attachments_uri":"https://api.soundcloud.com/tracks/190901632/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track", "svgId":"astral.wav","id":173054433,"created_at":"2014/10/20 20:40:50 +0000","user_id":83918,"duration":209756,"commentable":true,"state":"finished","original_content_size":36997204,"last_modified":"2015/04/25 14:37:54 +0000","sharing":"public","tag_list":"nodrums","permalink":"astral-trails","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"everythingstaysthesame","title":"Astral Trails","description":"Everything stays the same.\n\nhttp://kingdeluxe.ca/everything-stays-the-same/\n","label_name":null,"release":null,"track_type":null,"key_signature":null,"isrc":null,"video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/173054433","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/astral-trails","artwork_url":"https://i1.sndcdn.com/artworks-000094591666-qwmy4l-large.jpg","waveform_url":"https://w1.sndcdn.com/e80layCyKjlI_m.png","stream_url":"https://api.soundcloud.com/tracks/173054433/stream","playback_count":9323,"download_count":0,"favoritings_count":331,"comment_count":27,"attachments_uri":"https://api.soundcloud.com/tracks/173054433/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","svgId":"cloudkey.wav","id":167681252,"created_at":"2014/09/14 14:20:02 +0000","user_id":83918,"duration":138460,"commentable":true,"state":"finished","original_content_size":24410120,"last_modified":"2015/07/06 19:07:58 +0000","sharing":"public","tag_list":"Bass KingDeluxe EverythingStaysTheSame","permalink":"cloud-key","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://boomkat.com/vinyl/1095145-alphabets-heaven-everything-stays-the-same","label_id":null,"purchase_title":"Vinyl Out Now","genre":"Clouds","title":"Cloud Key","description":"Cloud Key\n\nEverything Stays The Same vinyl out now. Digital out later this month","label_name":"King Deluxe / Blackmarket","release":null,"track_type":null,"key_signature":null,"isrc":null,"video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/167681252","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/cloud-key","artwork_url":"https://i1.sndcdn.com/artworks-000090986609-v13pre-large.jpg","waveform_url":"https://w1.sndcdn.com/TRQbior74UW3_m.png","stream_url":"https://api.soundcloud.com/tracks/167681252/stream","playback_count":3177,"download_count":0,"favoritings_count":91,"comment_count":9,"attachments_uri":"https://api.soundcloud.com/tracks/167681252/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":135979454,"created_at":"2014/02/21 11:37:44 +0000","user_id":83918,"duration":246148,"commentable":true,"state":"finished","original_content_size":10041624,"last_modified":"2014/02/21 11:39:47 +0000","sharing":"public","tag_list":"Remix","permalink":"m-a-beat-pushing-forms-remixes","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"MABeat","title":"M.A BEAT! - Idols (Alphabets Heaven Remix)","description":"Get the pushing forms remix EP at\r\n\r\nhttp://mabeat.bandcamp.com/\r\n\r\n\r\n","label_name":"","release":"","track_type":"","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/135979454","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/m-a-beat-pushing-forms-remixes","artwork_url":"https://i1.sndcdn.com/artworks-000071481065-le0ky7-large.jpg","waveform_url":"https://w1.sndcdn.com/Ub0fdRZOuXgt_m.png","stream_url":"https://api.soundcloud.com/tracks/135979454/stream","playback_count":4131,"download_count":0,"favoritings_count":158,"comment_count":13,"attachments_uri":"https://api.soundcloud.com/tracks/135979454/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","svgId":"ecoute.wav",  "id":117289816,"created_at":"2013/10/27 13:23:38 +0000","user_id":83918,"duration":272533,"commentable":true,"state":"finished","original_content_size":48057788,"last_modified":"2015/09/06 23:59:20 +0000","sharing":"public","tag_list":"Remix \"King Deluxe\"","permalink":"julien-mier-je-tecoute","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://store.kingdeluxe.ca/album/when-will-they-wake-up","label_id":null,"purchase_title":"Purchase","genre":"Julien Mier","title":"Julien Mier - Je t'ecoute  (Alphabets Heaven Remix)","description":"Remix for Julien Mier's 'When Will They Wake Up' vinyl. Out November 4th","label_name":"King Deluxe","release":"","track_type":"","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/117289816","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/julien-mier-je-tecoute","artwork_url":"https://i1.sndcdn.com/artworks-000061186662-v0pnrz-large.jpg","waveform_url":"https://w1.sndcdn.com/LMHq482LDtmd_m.png","stream_url":"https://api.soundcloud.com/tracks/117289816/stream","playback_count":9996,"download_count":0,"favoritings_count":361,"comment_count":36,"attachments_uri":"https://api.soundcloud.com/tracks/117289816/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":97245802,"created_at":"2013/06/17 12:45:13 +0000","user_id":83918,"duration":236560,"commentable":true,"state":"finished","original_content_size":10821161,"last_modified":"2014/11/17 07:35:30 +0000","sharing":"public","tag_list":"","permalink":"showme","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://cleaningtapes.bandcamp.com/album/mountain-sound","label_id":null,"purchase_title":"$$$$$$$$$$$$$$$$$$$$$$","genre":"Haze","title":"showme","description":"mountainsound out on cleaning tapes\r\n\r\nhttp://cleaningtapes.bandcamp.com/album/mountain-sound\r\n\r\n","label_name":"","release":"","track_type":"original","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/97245802","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/showme","artwork_url":"https://i1.sndcdn.com/artworks-000050796697-rsox7p-large.jpg","waveform_url":"https://w1.sndcdn.com/UcJR5bovr9Rn_m.png","stream_url":"https://api.soundcloud.com/tracks/97245802/stream","playback_count":6735,"download_count":0,"favoritings_count":121,"comment_count":30,"attachments_uri":"https://api.soundcloud.com/tracks/97245802/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":97233815,"created_at":"2013/06/17 10:19:36 +0000","user_id":83918,"duration":172816,"commentable":true,"state":"finished","original_content_size":8271620,"last_modified":"2014/12/28 02:03:56 +0000","sharing":"public","tag_list":"","permalink":"mydreamsarequiet","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"Haze","title":"mydreamsarequiet","description":"mydreamsarequiet from mountainsound. Out on Cleaning Tapes","label_name":"","release":"","track_type":"original","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/97233815","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/mydreamsarequiet","artwork_url":"https://i1.sndcdn.com/artworks-000050789345-c17r9p-large.jpg","waveform_url":"https://w1.sndcdn.com/2gKDjEc8EFMH_m.png","stream_url":"https://api.soundcloud.com/tracks/97233815/stream","playback_count":4981,"download_count":0,"favoritings_count":137,"comment_count":23,"attachments_uri":"https://api.soundcloud.com/tracks/97233815/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","svgId":"rnning.wav","id":96863415,"created_at":"2013/06/14 13:35:31 +0000","user_id":83918,"duration":215530,"commentable":true,"state":"finished","original_content_size":38080210,"last_modified":"2014/12/16 18:49:18 +0000","sharing":"public","tag_list":"","permalink":"rnning","streamable":true,"embeddable_by":"none","downloadable":false,"purchase_url":null,"label_id":19876520,"purchase_title":null,"genre":"Haze","title":"rnning","description":"mountainsound out June 2013 through Cleaning Tapes","label_name":"Cleaning Tapes","release":"","track_type":"original","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"aiff","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/96863415","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"label":{"id":19876520,"kind":"user","permalink":"cleaningtapes","username":"Cleaning Tapes","last_modified":"2015/09/12 15:31:04 +0000","uri":"https://api.soundcloud.com/users/19876520","permalink_url":"http://soundcloud.com/cleaningtapes","avatar_url":"https://i1.sndcdn.com/avatars-000061423866-q63nmf-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/rnning","artwork_url":"https://i1.sndcdn.com/artworks-000050578710-oroj91-large.jpg","waveform_url":"https://w1.sndcdn.com/iIIkbHwVKxvh_m.png","stream_url":"https://api.soundcloud.com/tracks/96863415/stream","playback_count":4899,"download_count":0,"favoritings_count":186,"comment_count":29,"attachments_uri":"https://api.soundcloud.com/tracks/96863415/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":92198569,"created_at":"2013/05/14 19:51:43 +0000","user_id":83918,"duration":239930,"commentable":true,"state":"finished","original_content_size":10415904,"last_modified":"2013/05/15 07:44:56 +0000","sharing":"public","tag_list":"","permalink":"feathers","streamable":true,"embeddable_by":"all","downloadable":true,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"Edit","title":"feathers","description":"Thanks for the 2000 follows. It's truly appreciated. Here's an edit.","label_name":"","release":"","track_type":"other","key_signature":"","isrc":"","video_url":null,"bpm":146,"release_year":null,"release_month":null,"release_day":null,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/92198569","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/feathers","artwork_url":"https://i1.sndcdn.com/artworks-000048033160-69hmd2-large.jpg","waveform_url":"https://w1.sndcdn.com/sesiwiolPDlS_m.png","stream_url":"https://api.soundcloud.com/tracks/92198569/stream","download_url":"https://api.soundcloud.com/tracks/92198569/download","playback_count":3296,"download_count":227,"favoritings_count":123,"comment_count":20,"attachments_uri":"https://api.soundcloud.com/tracks/92198569/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":78067276,"created_at":"2013/02/06 10:22:49 +0000","user_id":83918,"duration":349655,"commentable":true,"state":"finished","original_content_size":13985031,"last_modified":"2014/10/07 19:09:37 +0000","sharing":"public","tag_list":"","permalink":"04-ivory-heart","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":null,"label_id":1947133,"purchase_title":null,"genre":"Beat","title":"Ivory Heart (via Sonic Router)","description":"http://www.sonicrouter.com/2013/02/premiere-alphabets-heaven-ivory-heart-king-deluxe/\r\n\r\nAlphabets Heaven - Siamese Burn EP\r\n\r\nOut ≈ March 2013 \r\n\r\nVocals by Emma Gatrill","label_name":"King Deluxe","release":"","track_type":"original","key_signature":"","isrc":"","video_url":null,"bpm":103,"release_year":2013,"release_month":3,"release_day":18,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/78067276","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"label":{"id":1947133,"kind":"user","permalink":"king_deluxe","username":"King Deluxe","last_modified":"2015/09/14 11:10:35 +0000","uri":"https://api.soundcloud.com/users/1947133","permalink_url":"http://soundcloud.com/king_deluxe","avatar_url":"https://i1.sndcdn.com/avatars-000173532650-fgzurb-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/04-ivory-heart","artwork_url":"https://i1.sndcdn.com/artworks-000041222871-nch4hv-large.jpg","waveform_url":"https://w1.sndcdn.com/6Uexx36bcUTr_m.png","stream_url":"https://api.soundcloud.com/tracks/78067276/stream","playback_count":12394,"download_count":0,"favoritings_count":365,"comment_count":34,"attachments_uri":"https://api.soundcloud.com/tracks/78067276/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":78067275, "svgId": "fornia.wav", "created_at":"2013/02/06 10:22:49 +0000","user_id":83918,"duration":274807,"commentable":true,"state":"finished","original_content_size":10991398,"last_modified":"2015/08/18 00:03:43 +0000","sharing":"public","tag_list":"california","permalink":"03-fornia","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://www.xlr8r.com/mp3/2013/02/fornia","label_id":null,"purchase_title":"download @ xlr8r","genre":"Beat","title":"Fornia","description":"Alphabets Heaven - Siamese Burn EP\r\n\r\nOut ≈ March 2013","label_name":"King Deluxe","release":"","track_type":"original","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/78067275","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/03-fornia","artwork_url":"https://i1.sndcdn.com/artworks-000040634877-hmvyyf-large.jpg","waveform_url":"https://w1.sndcdn.com/a84aLyfxROeJ_m.png","stream_url":"https://api.soundcloud.com/tracks/78067275/stream","playback_count":18539,"download_count":0,"favoritings_count":652,"comment_count":56,"attachments_uri":"https://api.soundcloud.com/tracks/78067275/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","svgId":"siamese.wav", "id":78067273,"created_at":"2013/02/06 10:22:49 +0000","user_id":83918,"duration":375858,"commentable":true,"state":"finished","original_content_size":15033064,"last_modified":"2015/04/22 15:36:33 +0000","sharing":"public","tag_list":"Psychedelic Loop 1shot","permalink":"01-siamese-burn","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://store.kingdeluxe.ca/album/siamese-burn-cd","label_id":1947133,"purchase_title":"OUT NOW","genre":"Beat","title":"Siamese Burn","description":"Alphabets Heaven - Siamese Burn\r\n\r\nOut Now\r\n","label_name":"King Deluxe","release":"","track_type":"original","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":2012,"release_month":3,"release_day":18,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/78067273","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"label":{"id":1947133,"kind":"user","permalink":"king_deluxe","username":"King Deluxe","last_modified":"2015/09/14 11:10:35 +0000","uri":"https://api.soundcloud.com/users/1947133","permalink_url":"http://soundcloud.com/king_deluxe","avatar_url":"https://i1.sndcdn.com/avatars-000173532650-fgzurb-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/01-siamese-burn","artwork_url":"https://i1.sndcdn.com/artworks-000043227481-kokhju-large.jpg","waveform_url":"https://w1.sndcdn.com/KBjX7zEr0Ojn_m.png","stream_url":"https://api.soundcloud.com/tracks/78067273/stream","playback_count":7267,"download_count":0,"favoritings_count":280,"comment_count":33,"attachments_uri":"https://api.soundcloud.com/tracks/78067273/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":70222467,"created_at":"2012/12/06 17:00:26 +0000","user_id":83918,"duration":199253,"commentable":true,"state":"finished","original_content_size":8497823,"last_modified":"2014/11/17 07:35:30 +0000","sharing":"public","tag_list":"beats","permalink":"alphabets-heaven-hands-up","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://kingdeluxe.ca/year-two","label_id":1947133,"purchase_title":"FREE HERE","genre":"Beat","title":"Alphabets Heaven - Hands Up","description":"An edit  for King Deluxe's Year Two Compilation","label_name":"King Deluxe","release":"","track_type":"remix","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":2012,"release_month":12,"release_day":4,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/70222467","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"label":{"id":1947133,"kind":"user","permalink":"king_deluxe","username":"King Deluxe","last_modified":"2015/09/14 11:10:35 +0000","uri":"https://api.soundcloud.com/users/1947133","permalink_url":"http://soundcloud.com/king_deluxe","avatar_url":"https://i1.sndcdn.com/avatars-000173532650-fgzurb-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/alphabets-heaven-hands-up","artwork_url":"https://i1.sndcdn.com/artworks-000035636589-ngoy2h-large.jpg","waveform_url":"https://w1.sndcdn.com/AY5e9IzDi1rt_m.png","stream_url":"https://api.soundcloud.com/tracks/70222467/stream","playback_count":4824,"download_count":0,"favoritings_count":98,"comment_count":22,"attachments_uri":"https://api.soundcloud.com/tracks/70222467/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":62305141,"created_at":"2012/10/05 12:44:51 +0000","user_id":83918,"duration":233269,"commentable":true,"state":"finished","original_content_size":9331042,"last_modified":"2013/01/10 18:19:28 +0000","sharing":"public","tag_list":"shadowbox psychedelic underwaterrainforestspaceship dub","permalink":"c-o-alphabets-heaven-remix","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://alphabetsheaven.bandcamp.com/track/c-o-alphabets-heaven-remix","label_id":null,"purchase_title":"download here","genre":"Beat","title":"C O (Alphabets Heaven Remix)","description":"","label_name":"","release":"","track_type":"remix","key_signature":"","isrc":"","video_url":"http://www.youtube.com/watch?v=_XFBsfw_uj8","bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/62305141","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/c-o-alphabets-heaven-remix","artwork_url":"https://i1.sndcdn.com/artworks-000031602576-k8qdvq-large.jpg","waveform_url":"https://w1.sndcdn.com/SEBYhtepyZVH_m.png","stream_url":"https://api.soundcloud.com/tracks/62305141/stream","playback_count":3459,"download_count":0,"favoritings_count":68,"comment_count":12,"attachments_uri":"https://api.soundcloud.com/tracks/62305141/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":50095295,"created_at":"2012/06/18 18:39:13 +0000","user_id":83918,"duration":275173,"commentable":true,"state":"finished","original_content_size":72765656,"last_modified":"2015/05/14 22:02:49 +0000","sharing":"public","tag_list":"bble bubbles bu bubblebobble father dad slowjamz \"slow jam\" bubblebobbleslowjamorgans organ darkbubbleroad","permalink":"fathers-day-alphabets-heaven","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://highhopessociety.bandcamp.com","label_id":null,"purchase_title":"Go","genre":"Bubble","title":"Fathers Day [Alphabets Heaven Remix]","description":"remix for high hopes society. \r\nhttp://highhopessociety.bandcamp.com/\r\n\r\n","label_name":"","release":"","track_type":"remix","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/50095295","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/fathers-day-alphabets-heaven","artwork_url":"https://i1.sndcdn.com/artworks-000025252801-r9ppp3-large.jpg","waveform_url":"https://w1.sndcdn.com/dyB9XPrxTEvY_m.png","stream_url":"https://api.soundcloud.com/tracks/50095295/stream","playback_count":3322,"download_count":0,"favoritings_count":76,"comment_count":14,"attachments_uri":"https://api.soundcloud.com/tracks/50095295/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":47174781,"created_at":"2012/05/22 07:40:17 +0000","user_id":83918,"duration":236993,"commentable":true,"state":"finished","original_content_size":9906058,"last_modified":"2014/12/28 02:03:56 +0000","sharing":"public","tag_list":"","permalink":"boosh","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"Beat","title":"Boosh","description":"01. Boosh                                            \r\n02. genggeng                                         \r\n03. Soul Dancing                                     \r\n04. Deartentonine                                   \r\n05. Darma (Headshotboyz Retrip)                     \r\n06. Woman (Robot Koch's Over The Moon Remix)        \r\n07. Arka (wArkawArka remix)                  ","label_name":"King Deluxe","release":"KING011","track_type":null,"key_signature":null,"isrc":null,"video_url":null,"bpm":null,"release_year":2012,"release_month":5,"release_day":1,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/47174781","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/boosh","artwork_url":"https://i1.sndcdn.com/artworks-000021323166-1mlg1w-large.jpg","waveform_url":"https://w1.sndcdn.com/W5T9Udcp4c5Q_m.png","stream_url":"https://api.soundcloud.com/tracks/47174781/stream","playback_count":5156,"download_count":0,"favoritings_count":117,"comment_count":20,"attachments_uri":"https://api.soundcloud.com/tracks/47174781/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track", "svgId":"deartentonine.wav", "id":42504347,"created_at":"2012/04/09 08:55:05 +0000","user_id":83918,"duration":122690,"commentable":true,"state":"finished","original_content_size":5335675,"last_modified":"2015/08/12 14:40:09 +0000","sharing":"public","tag_list":"","permalink":"deartentonine","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://store.kingdeluxe.ca/album/boosh","label_id":null,"purchase_title":null,"genre":"Beat","title":"Deartentonine","description":"Out in May\r\nOut in May\r\n\r\n01. Boosh                                            \r\n02. genggeng                                         \r\n03. Soul Dancing                                     \r\n04. Deartentonine                                   \r\n05. Darma (Headshotboyz Retrip)                     \r\n06. Woman (Robot Koch's Over The Moon Remix)        \r\n07. Arka (wArkawArka remix)                  ","label_name":"King Deluxe","release":"KING011","track_type":"","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":2012,"release_month":5,"release_day":1,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/42504347","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/deartentonine","artwork_url":"https://i1.sndcdn.com/artworks-000021323166-1mlg1w-large.jpg","waveform_url":"https://w1.sndcdn.com/if3qVJKWPshC_m.png","stream_url":"https://api.soundcloud.com/tracks/42504347/stream","playback_count":4269,"download_count":0,"favoritings_count":83,"comment_count":30,"attachments_uri":"https://api.soundcloud.com/tracks/42504347/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":34263678,"created_at":"2012/01/23 11:14:27 +0000","user_id":83918,"duration":318683,"commentable":true,"state":"finished","original_content_size":13030842,"last_modified":"2015/09/03 17:13:03 +0000","sharing":"public","tag_list":"Rosewater wheresthehang porticoquartet","permalink":"steepless-1","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://soundcloud.com/alphabetsheaven/steepless-1","label_id":null,"purchase_title":null,"genre":"Psychedelic","title":"Steepless","description":"Portico Quartet refuddle","label_name":"","release":"","track_type":"remix","key_signature":"","isrc":"","video_url":"http://www.youtube.com/watch?v=ctFPrLtSWg8","bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/34263678","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/steepless-1","artwork_url":"https://i1.sndcdn.com/artworks-000017201313-5jnmj2-large.jpg","waveform_url":"https://w1.sndcdn.com/IMwrxMvT5bAr_m.png","stream_url":"https://api.soundcloud.com/tracks/34263678/stream","playback_count":3926,"download_count":9,"favoritings_count":108,"comment_count":38,"attachments_uri":"https://api.soundcloud.com/tracks/34263678/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":32418792,"created_at":"2012/01/04 20:25:29 +0000","user_id":83918,"duration":157238,"commentable":true,"state":"finished","original_content_size":41620828,"last_modified":"2015/05/08 13:18:42 +0000","sharing":"public","tag_list":"Rosewater Beat Psyche Voodou","permalink":"iou","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://alphabetsheaven.bandcamp.com/album/rosewater","label_id":null,"purchase_title":null,"genre":"Psychedelic","title":"Iou","description":"Promo track for Rosewater tape, check the Bandcamp.","label_name":"","release":"","track_type":"other","key_signature":"","isrc":"","video_url":"http://www.youtube.com/watch?v=q00oC_V9DpE","bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"aiff","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/32418792","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/iou","artwork_url":"https://i1.sndcdn.com/artworks-000016278603-8mg6s8-large.jpg","waveform_url":"https://w1.sndcdn.com/2sfFb7s92Ehb_m.png","stream_url":"https://api.soundcloud.com/tracks/32418792/stream","playback_count":6181,"download_count":0,"favoritings_count":92,"comment_count":41,"attachments_uri":"https://api.soundcloud.com/tracks/32418792/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":29477791,"created_at":"2011/12/01 20:31:43 +0000","user_id":83918,"duration":208710,"commentable":true,"state":"finished","original_content_size":36799760,"last_modified":"2013/01/10 18:19:28 +0000","sharing":"public","tag_list":"underwater rainforest","permalink":"youberg-alphabets-heaven","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":"http://store.kingdeluxe.ca","label_id":null,"purchase_title":"Purchase?","genre":"Kawabata","title":"Youberg - [Alphabets Mix]","description":"","label_name":"King Deluxe","release":"","track_type":"remix","key_signature":"C","isrc":"","video_url":"http://vimeo.com/49112993","bpm":22.2,"release_year":null,"release_month":null,"release_day":null,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/29477791","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/youberg-alphabets-heaven","artwork_url":"https://i1.sndcdn.com/artworks-000014778003-qpelsj-large.jpg","waveform_url":"https://w1.sndcdn.com/w6xMoVynrjmN_m.png","stream_url":"https://api.soundcloud.com/tracks/29477791/stream","playback_count":2403,"download_count":0,"favoritings_count":43,"comment_count":21,"attachments_uri":"https://api.soundcloud.com/tracks/29477791/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":22963761,"created_at":"2011/09/09 14:37:15 +0000","user_id":83918,"duration":199990,"commentable":true,"state":"finished","original_content_size":35249820,"last_modified":"2012/10/01 20:53:07 +0000","sharing":"public","tag_list":"Human Planet adelic","permalink":"manni-dee-flowlight-alphabets","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"Jungle","title":"Manni Dee - Flowlight (Alphabets Heaven Remix)","description":"Manni Dee's Superposition EP\r\n\r\nhttp://music.saturaterecords.com/album/manni-dee-superposition-ep-strtep007","label_name":"","release":"","track_type":"remix","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/22963761","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/manni-dee-flowlight-alphabets","artwork_url":"https://i1.sndcdn.com/artworks-000011370119-yspiju-large.jpg","waveform_url":"https://w1.sndcdn.com/xllz0836VJsX_m.png","stream_url":"https://api.soundcloud.com/tracks/22963761/stream","playback_count":1824,"download_count":0,"favoritings_count":34,"comment_count":22,"attachments_uri":"https://api.soundcloud.com/tracks/22963761/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":22844364,"created_at":"2011/09/07 23:48:24 +0000","user_id":83918,"duration":211437,"commentable":true,"state":"finished","original_content_size":37269320,"last_modified":"2014/01/05 09:12:52 +0000","sharing":"public","tag_list":"Herzog","permalink":"soul-dancing","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"Psychedelic","title":"Soul Dancing","description":"","label_name":"","release":"","track_type":"original","key_signature":"","isrc":"","video_url":null,"bpm":94,"release_year":null,"release_month":null,"release_day":null,"original_format":"wav","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/22844364","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/soul-dancing","artwork_url":"https://i1.sndcdn.com/artworks-000024831618-7kkaut-large.jpg","waveform_url":"https://w1.sndcdn.com/W4Vu8LlJ0qa6_m.png","stream_url":"https://api.soundcloud.com/tracks/22844364/stream","playback_count":6902,"download_count":0,"favoritings_count":127,"comment_count":46,"attachments_uri":"https://api.soundcloud.com/tracks/22844364/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":5218708,"created_at":"2010/09/11 01:18:36 +0000","user_id":83918,"duration":158127,"commentable":true,"state":"finished","original_content_size":3816262,"last_modified":"2013/09/11 08:16:31 +0000","sharing":"public","tag_list":"","permalink":"woman-alessis-ark","streamable":true,"embeddable_by":"all","downloadable":true,"purchase_url":"http://store.kingdeluxe.ca/album/jays-odyssey","label_id":null,"purchase_title":null,"genre":"","title":"Woman (Alessi's Ark)","description":"From Jay's Odyssey, check kingdeluxe.ca for more. And Alessi's Ark","label_name":"King Deluxe","release":"","track_type":"","key_signature":"Gm","isrc":"","video_url":null,"bpm":null,"release_year":2011,"release_month":1,"release_day":1,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/5218708","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/woman-alessis-ark","artwork_url":"https://i1.sndcdn.com/artworks-000002311760-w51jy9-large.jpg","waveform_url":"https://w1.sndcdn.com/VdkxTHbicoKp_m.png","stream_url":"https://api.soundcloud.com/tracks/5218708/stream","download_url":"https://api.soundcloud.com/tracks/5218708/download","playback_count":2558,"download_count":240,"favoritings_count":45,"comment_count":11,"attachments_uri":"https://api.soundcloud.com/tracks/5218708/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":5218703,"created_at":"2010/09/11 01:18:34 +0000","user_id":83918,"duration":270443,"commentable":true,"state":"finished","original_content_size":6489256,"last_modified":"2013/07/06 10:37:57 +0000","sharing":"public","tag_list":"","permalink":"08-darma","streamable":true,"embeddable_by":"all","downloadable":true,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"","title":"Darma","description":"","label_name":"","release":"","track_type":"","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/5218703","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/08-darma","artwork_url":"https://i1.sndcdn.com/artworks-000002311760-w51jy9-large.jpg","waveform_url":"https://w1.sndcdn.com/1v5Pt9fpPA6c_m.png","stream_url":"https://api.soundcloud.com/tracks/5218703/stream","download_url":"https://api.soundcloud.com/tracks/5218703/download","playback_count":2026,"download_count":226,"favoritings_count":65,"comment_count":3,"attachments_uri":"https://api.soundcloud.com/tracks/5218703/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":550528,"created_at":"2009/08/30 09:27:27 +0000","user_id":83918,"duration":253126,"commentable":true,"state":"finished","original_content_size":13780178,"last_modified":"2011/12/10 10:10:03 +0000","sharing":"public","tag_list":"Lo-fi Brighton","permalink":"03-koko","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"Dubstep","title":"Koko","description":"I know the intro sounds kinda broken but it happened when I'd just moved into this new house in Brighton. All I'd taken with me was my guitar and laptop. I was playing into this empty room and started playing around with this MF Doom/Love arps. The millimeter mic was all I had and I think it's the best I've ever sounded.","label_name":"","release":"","track_type":"","key_signature":"","isrc":"","video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/550528","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/03-koko","artwork_url":"https://i1.sndcdn.com/artworks-000000566175-w8606z-large.jpg","waveform_url":"https://w1.sndcdn.com/dtouj3dk9RMv_m.png","stream_url":"https://api.soundcloud.com/tracks/550528/stream","playback_count":1928,"download_count":1,"favoritings_count":23,"comment_count":6,"attachments_uri":"https://api.soundcloud.com/tracks/550528/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":550527,"created_at":"2009/08/30 09:27:27 +0000","user_id":83918,"duration":263235,"commentable":true,"state":"finished","original_content_size":14184553,"last_modified":"2012/05/09 17:38:23 +0000","sharing":"public","tag_list":"Dub 2-step","permalink":"02-kaxa","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"Dubstep","title":"Kaxa","description":"Jo Donnelly on the Mic","label_name":"","release":"","track_type":"original","key_signature":"Em","isrc":"","video_url":null,"bpm":140,"release_year":null,"release_month":null,"release_day":null,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/550527","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/02-kaxa","artwork_url":"https://i1.sndcdn.com/artworks-000000566157-gbzmcb-large.jpg","waveform_url":"https://w1.sndcdn.com/54pzD558Qzp9_m.png","stream_url":"https://api.soundcloud.com/tracks/550527/stream","playback_count":2722,"download_count":0,"favoritings_count":43,"comment_count":20,"attachments_uri":"https://api.soundcloud.com/tracks/550527/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"},
{"kind":"track","id":550526,"created_at":"2009/08/30 09:27:27 +0000","user_id":83918,"duration":139885,"commentable":true,"state":"finished","original_content_size":9250548,"last_modified":"2012/12/06 16:29:09 +0000","sharing":"public","tag_list":"Boom Bap","permalink":"01-susanne","streamable":true,"embeddable_by":"all","downloadable":false,"purchase_url":null,"label_id":null,"purchase_title":null,"genre":"Lo-Fi","title":"Susanne","description":"And she feeds you tea and oranges that come all the way from China...","label_name":"","release":"","track_type":"original","key_signature":"Fm","isrc":"","video_url":null,"bpm":null,"release_year":null,"release_month":null,"release_day":null,"original_format":"mp3","license":"all-rights-reserved","uri":"https://api.soundcloud.com/tracks/550526","user":{"id":83918,"kind":"user","permalink":"alphabetsheaven","username":"alphabetsheaven","last_modified":"2015/08/30 03:39:09 +0000","uri":"https://api.soundcloud.com/users/83918","permalink_url":"http://soundcloud.com/alphabetsheaven","avatar_url":"https://i1.sndcdn.com/avatars-000038829281-xikuam-large.jpg"},"permalink_url":"http://soundcloud.com/alphabetsheaven/01-susanne","artwork_url":"https://i1.sndcdn.com/artworks-000000566149-byqvax-large.jpg","waveform_url":"https://w1.sndcdn.com/jPUlaKqHzIcA_m.png","stream_url":"https://api.soundcloud.com/tracks/550526/stream","playback_count":2937,"download_count":0,"favoritings_count":41,"comment_count":23,"attachments_uri":"https://api.soundcloud.com/tracks/550526/attachments","policy":"ALLOW","monetization_model":"NOT_APPLICABLE"}]
// Inspired by http://bit.ly/juSAWl
// Augment String.prototype to allow for easier formatting.  This implementation 
// doesn't completely destroy any existing String.prototype.format functions,
// and will stringify objects/arrays.
String.prototype.format = function(i, safe, arg) {

  function format() {
    var str = this, len = arguments.length+1;

    // For each {0} {1} {n...} replace with the argument in that position.  If 
    // the argument is an object or an array it will be stringified to JSON.
    for (i=0; i < len; arg = arguments[i++]) {
      safe = typeof arg === 'object' ? JSON.stringify(arg) : arg;
      str = str.replace(RegExp('\\{'+(i-1)+'\\}', 'g'), safe);
    }
    return str;
  }

  // Save a reference of what may already exist under the property native.  
  // Allows for doing something like: if("".format.native) { /* use native */ }
  format.native = String.prototype.format;

  // Replace the prototype property
  return format;

}();
var videoData = [
		{name: 'Birthday', embed: '<iframe src="https://player.vimeo.com/video/62144786" width="500" height="281" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe> <p><a href="https://vimeo.com/62144786">Alphabets Heaven - Birthday</a> from <a href="https://vimeo.com/diplodok493">diplodok493</a> on <a href="https://vimeo.com">Vimeo</a>.</p>'}
];