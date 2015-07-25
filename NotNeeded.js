/**
 * 
 */
var reduceFunction = function(buffer, factor) {
	var newBuffer = [];
	var jump = Math.pow(2, factor);
	var c = 0;
	for (i = 0; i < buffer.length; i += jump) {
    	newBuffer[c] = buffer[i];
    	c++;
	}
	return newBuffer;
};

/**
 *
 */
var splitIntoArrays = function(buffer, arrayCount) {
	var list = []; //list of arrays
	var aLen = Math.ceil(buffer.length / arrayCount);
	for (var i = 0; i < arrayCount; i++) {
		try {
		list[i] = buffer.slice(i * aLen, (i + 1) * aLen);
		} catch (e) {
		  debugger;
		}
	}
	return list;
};

var performLoop = function(func, limit, interval) {
	debugger;
	var me = this;
	var i = 0;
	var opts = Array.prototype.slice.call(arguments, 3); //remove first 3 arguments
	var ol = opts.length;
	opts[ol] = i;
	func.apply(me, opts);
	i++;	
	var timer = setInterval( function() { 
   		if (i < limit) {
   			opts[ol] = i; //update opts iteration number
   			func.apply(me, opts);
   			i++;
   		} else {
   			clearInterval(timer);
   		}
   	}, interval);
};


   //player.play();
   
   
   //audioWrite = reduceFunction(buffer, 6);
   //var frames = 5;
   //var list = splitIntoArrays(audioWrite, frames);
   
   
   
   
   //var writeList = function(list, canvas, i) {
   // listToCanvas(list[i], canvas);
   //}
   //performLoop(writeList, frames, 900, list, canvas);
   
   