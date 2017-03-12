
const Waveform = require('./waveform')

function populateTrackTable (tracks) {
  // create tracks table
  let tStr = tracks.reduce((str, track) => `${str}<a href="#" onclick="playAudio('${track.url}')"><div class="track-item">${track.title}</div></a>`, '')
  $('.track-table').append(tStr)
}

window.playAudio = (trackUrl) => {
  const track = window.scData.find(tr => tr.url === trackUrl)
  window.lw.run(track)
}

$(function () {
  window.lw = new Waveform('long')
  populateTrackTable(window.scData)
  window.playAudio(window.scData[0].url)
})
