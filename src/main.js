
const Waveform = require('./waveform')

function populateTrackTable (tracks) {
  // create tracks table
  let tStr = tracks.reduce((str, track) => `${str}<a href="#" onclick="playAudio('${track.url}');event.stopPropagation()"><div class="track-item">${track.title}</div></a>`, '')
  $('.track-table').append(tStr)
}

window.playAudio = (trackUrl) => {
  const track = window.scData.find(tr => tr.url === trackUrl)
  window.lw.run(track, () => window.lw.play())
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
  window.lw.run(track)
  window.lw.onEnded = () => {
    const currentIndex = window.scData.findIndex(tr => tr.url === window.lw.trackInfo.url)
    if (currentIndex > -1 && (currentIndex + 1) < window.scData.length) {
      // get next track
      setTimeout(() => window.playAudio(window.scData[currentIndex + 1].url), 3000)
    }
  }
})
