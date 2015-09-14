/*
 * waveformjs
 * https://github.com/jonnywildey/waveformjs
 *
 * Copyright (c) 2015 Jonny Wildey
 * Licensed under the MIT license.
 */
var fs = require('fs');

(function (exports) {

  'use strict';
  var wavedraw = require('./wavedraw');
  
  //setup server
  var http = require('http');
  var PORT = 8081;
  
  //basic request
  function handleRequest(request, response) {
    debugger;

    function writeSvg(svg, json, audioFile) {

      var fName = audioFile.split('/');
      fName = fName[fName.length - 1];
      //write svg to file
      fs.writeFile('svg/' + fName + '.svg', svg, function (err) {
        if (err) {
          return console.log(err);
        }
      });
      //write json to file
      fs.writeFile('json/' + fName + '.json', JSON.stringify(json), function (err) {
        if (err) {
          return console.log(err);
        }
        console.log(fName + ' written!');
      });
      response.writeHead(200, { "Content-Type": "text/html" });
      response.write('<!DOCTYPE "html">');
      response.end('<body>' + svg + '</body>');
    };

    function getFile(file) {
      var fullPath = '/~Jonny/waveformjs/audio/' + file;
      wavedraw.drawSpiral(fullPath, writeSvg);
    };

    var url = request.url;
    var components = url.split('/');
    switch (components[1]) {
      case 'spirals':
        var sPath = components[2];
        console.log(sPath);
        getFile(sPath);
        break;
    }

  }
  //start server
  var server = http.createServer(handleRequest);
  server.listen(PORT, function () {
    console.log("Server listening on: http://localhost:%s", PORT);
  });


  exports.awesome = function () {
    return 'awesome';
  };

} (typeof exports === 'object' && exports || this));
