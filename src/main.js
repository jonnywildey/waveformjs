
const Waveform = require('./waveform')
// var clientId = '84a4cf04866f2c6ce3cde18d76be4898';
window.lw = new Waveform()

function populateTrackTable (tracks) {
  // create tracks table
  let tStr = tracks.reduce((str, track) => `${str}<div class="track-item"><a href="#" onclick="playAudio('${track.url}')">${track.title}</a></div>`, '')
  // add spacer
  tStr += ' <div class="track-item-spacer"></div>'
  $('.track-table').append(tStr)
}

window.playAudio = (trackUrl) => {
  const track = window.scData.find(tr => tr.url === trackUrl)
  window.lw.run('long', track)
}

$(function () {
  populateTrackTable(window.scData)
  window.playAudio(window.scData[0].url)
})
