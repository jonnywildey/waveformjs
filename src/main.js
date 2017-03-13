
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

function getSearchParams (k) {
  var p = {}
  window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (s, k, v) { p[k] = v })
  return k ? p[k] : p
}

$(function () {
  window.lw = new Waveform('long')
  const id = getSearchParams('id')
  const track = window.scData.find(track => track.id === id) || window.scData[0]
  populateTrackTable(window.scData)
  window.playAudio(track.url)
})
