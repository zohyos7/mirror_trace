// This set of scripts implements a mirror trace task suitable for online use with Qualtrics
// It was written by Bob Calin-Jageman
// I was learning javascript as a I went; the code is stitched together from various online sources; sorry it is not very elegant
// You can see a demo of this script in action at: https://dom.az1.qualtrics.com/jfe/form/SV_eeSj6E3YyI8nxdP

// this object contains the materials for the task - 
//   the mirror property say if that trial should be mirrored
//   the file_names property give the file names for the images to use for each trial.
          // NOTE: Currently this points to images hosted on the github site for this project.  You can change this but be sure:
		  // That the images are hosted on an https server with a flag set to allow cross-domain loading of images
//    xstarts, ystarts are the coordinates for the green dot that sets the trial start
//    xends, yends are the coordinates for where the trial ends
// currently this displays 3 difficult trials (h1, h2, and h3) and 3 regular trials (4, 5, 6)
// the images posted on github all have the same total line length and 15 segments 
var materials = {
		'mirror' : [false, true, true, true, true, true, true],
		'file_names' : ["https://raw.githubusercontent.com/rcalinjageman/mirror_trace/master/sample.png", "https://raw.githubusercontent.com/rcalinjageman/mirror_trace/master/trialh1.png", "https://raw.githubusercontent.com/rcalinjageman/mirror_trace/master/trialh2.png", "https://raw.githubusercontent.com/rcalinjageman/mirror_trace/master/trialh3.png", "https://raw.githubusercontent.com/rcalinjageman/mirror_trace/master/trial1.png", "https://raw.githubusercontent.com/rcalinjageman/mirror_trace/master/trial2.png", "https://raw.githubusercontent.com/rcalinjageman/mirror_trace/master/trialh3.png"],
		'xstarts' : [47,	27,		40,		280,	27, 	40, 	280],
		'ystarts' : [256,	275,	45,		276,	275, 	45, 	276],
		'xends' :   [344,	370,	368,	33,		370, 	368, 	33],
		'yends' :   [260,	28,		267,	250,	28,		267,	250]
	}
	
	//	'xstarts' : [47,	27,		40,		280,		40,		383,	352],
//		'ystarts' : [256,	275,	45,		276,		45,		265,	28],
//		'xends' :   [344,	370,	368,	33,			368,	28,		35],
//		'yends' :    [260,	28,		267,	250,		267,	15,		175]


      
// there are some key settings below you will want to set for your usage

function do_mirror() {	
	//load materials
	// trial number will be set within qualtrics when this script is called
	var imagePath = materials.file_names[trialnumber];	
	mirror = materials.mirror[trialnumber];
	var xstart = materials.xstarts[trialnumber];
	var ystart = materials.ystarts[trialnumber];;
	var startRadius = 15;
	var xend = materials.xends[trialnumber];
	var yend = materials.yends[trialnumber];
	var endRadius = 7;

	//for saving screenshots
	// the script can save screenshots of completed trials.  
	// to use this feature, set saveTrace to true and set saveScript to your server.  Your server will need a php script for accepting the files.
	// the php script is posted on github
	var saveScript = "http://calin-jageman.net/mirror_trace/save.php"
	var saveTrace = false;
	
    //image dimensions
	var mywidth = 400;
	var myheight = 300;
	
	//states to track
	var drawing = false;
	var finished = false;
	var score = 0;
	var inline = false;
	var crossings = 0;
	var distance_total = 0;
	var distance_current = 0;
	var distance_inline = 0;
	var distance_offline = 0;
	var startTime = 0;
	var endTime = 0;
	var timeDiff = 0;
	var lastRefresh = 0;
	var currentRefresh = 0;
	
	//drawing contexts for cursor area and mirrored area
	var canvas = document.querySelector('#paint');
	var ctx = canvas.getContext('2d');
	var canvas_mirror = document.querySelector('#mirror');
	var ctx_mirror = canvas_mirror.getContext('2d');
	
	//load the image to trace
	var imageObj = new Image();
      imageObj.onload = function() {
       ctx_mirror.drawImage(imageObj, 0, 0, mywidth, myheight);
	   ctx_mirror.globalAlpha=0.4;
	   ctx.globalAlpha=0.4;
	   
	   ctx.beginPath();
	    if (mirror) {
			ctx.arc(xstart, ystart, startRadius, 0, 2 * Math.PI, false);
		} else {
			ctx.arc(xstart, ystart, startRadius, 0, 2 * Math.PI, false);
		}
	   ctx.fillStyle = 'green';
	   ctx.fill();
	   ctx_mirror.globalAlpha=1;
	   ctx.globalAlpha=1;
	   document.getElementById("status").innerHTML = "Click the green circle to begin this trial"; 
    };
	imageObj.crossOrigin="anonymous";
    imageObj.src=imagePath;
	

	//defines data structure for mouse movement
	var mouse = {x: 0, y: 0};	
    var mouseold = {x: 0, y: 0};	

	/* Drawing on Paint App */
	ctx_mirror.lineWidth = 1.2;
	ctx_mirror.lineJoin = 'round';
	ctx_mirror.lineCap = 'round';
	ctx_mirror.strokeStyle = 'blue';
	
	/* Mouse Capturing Work */
	canvas.addEventListener('mousemove', function(e) {
	    //get mouse coordinates
		mouse.x = e.pageX - this.offsetLeft;
		mouse.y = e.pageY - this.offsetTop;
		
		//update status
		var pos = findPos(this);
         var x = e.pageX - pos.x;
         var y = e.pageY - pos.y;
		 
		 if (mirror) {
			var coord = "x=" +  (mywidth-x) + ", y=" + (myheight-y);
		} else {
			var coord = "x=" +  (x) + ", y=" + (y);
		}

		if (mirror) {
         var p = ctx_mirror.getImageData(mywidth-mouse.x, myheight-mouse.y, 1, 1).data; 
		} else {
		 var p = ctx_mirror.getImageData(mouse.x, mouse.y, 1, 1).data; 
		}
         var hex = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
		 
		 var cendRadius = Math.sqrt(Math.pow(mouse.x - xend, 2) + Math.pow(mouse.y-yend, 2));
		 if (cendRadius < endRadius) {
		  if (drawing) {
			drawing = false;
			finished = true;
			if (saveTrace) {
				saveCanvas();
				//call save function
			}
		  }
		}
		 		 
		 //do drawing if in drawing mode
		 if(drawing) {
		    
		    if (mouseold.x - mouse.x + mouseold.y - mouse.y != 0) {
				distance_current = Math.sqrt(  Math.pow(mouseold.x - mouse.x, 2) + Math.pow(mouseold.y - mouse.y, 2) )
			} else {
				distance_current = 0;
			}

			//check to see where we are drawing
			if (p[0]+p[1]+p[2] == 0) {
				if(inline) {
					distance_inline = distance_inline + distance_current;
				} else {
					inline = true;
					crossings = crossings+ 1;
					distance_inline = distance_inline + (0.5*distance_current);
					distance_offline = distance_offline + (0.5*distance_current);
					ctx_mirror.beginPath();
					if(mirror) {
						ctx_mirror.moveTo(mywidth-mouse.x, myheight-mouse.y);
					} else {
						ctx_mirror.moveTo(mouse.x, mouse.y);
					}
				}
			}  else {
				if(inline) {
					inline = false;
					crossings = crossings + 1;
					distance_inline = distance_inline + (0.5*distance_current);
					distance_offline = distance_offline + (0.5*distance_current);
					ctx_mirror.beginPath();
					if(mirror) {
						ctx_mirror.moveTo(mywidth-mouse.x, myheight-mouse.y);
					} else {
						ctx_mirror.moveTo(mouse.x, mouse.y);
					}
				} else {
					distance_offline = distance_offline + distance_current;
				}
			} 
				
			distance_total = distance_total + distance_current;	
			score = distance_inline / distance_total;
			endTime = new Date();
			timeDiff = (endTime - startTime)/1000;
			
			if (inline) {
				ctx_mirror.strokeStyle = 'red';
			} else {
				ctx_mirror.strokeStyle = 'blue';
			}

			if (mirror) {
				ctx_mirror.lineTo(mywidth-mouse.x, myheight-mouse.y);
			} else {
				ctx_mirror.lineTo(mouse.x, mouse.y);
			}
			ctx_mirror.stroke();				
			document.getElementById("status").innerHTML = "Score = " + Math.round(score *100) +"%"; 
		} else {
		    if(!finished) {
			currentRefresh = new Date();
			if (currentRefresh - lastRefresh > (1000/30) ) {
				ctx_mirror.drawImage(imageObj, 0, 0, mywidth, myheight);
				
				ctx_mirror.fillStyle = 'green';
				ctx_mirror.globalAlpha=0.4;
				//ctx_mirror.beginPath();
	            if (mirror) {
				//	ctx_mirror.arc(mywidth - xstart, myheight - ystart, startRadius, 0, 2 * Math.PI, false);
				} else {
				//	ctx_mirror.arc(xstart, ystart, startRadius, 0, 2 * Math.PI, false);
				}
	           // ctx_mirror.fill();
				ctx_mirror.globalAlpha=1
				
				ctx_mirror.beginPath();
				if (mirror) {
					ctx_mirror.arc(mywidth-mouse.x, myheight-mouse.y, 4, 0, 2 * Math.PI, false);
				} else {
					ctx_mirror.arc(mouse.x, mouse.y, 4, 0, 2 * Math.PI, false);
				}
				ctx_mirror.fillStyle = 'green';
				ctx_mirror.fill();
				lastRefresh = currentRefresh
				document.getElementById("status").innerHTML = "Click the green circle to begin this trial"; 
			}
			} else {
				document.getElementById("status").innerHTML = "Finsihed with score = " + Math.round(score *100) + "%<BR> Click next to continue."; 
			}
		}
		 
		 
		 //store current coordinates
		 mouseold.x = mouse.x;
		 mouseold.y = mouse.y;
		 
	}, false);
	
	
	 
	canvas.addEventListener('mousedown', function(e) {
	        var currentRadius = Math.sqrt(Math.pow(mouse.x - xstart, 2) + Math.pow(mouse.y-ystart, 2));
	
	        if(!finished) {
				if (drawing) {
					//drawing = false;
					//finished = true;
					//if (saveTrace) {
					//	saveCanvas();
						//call save function
						//savecanvas(canvas_mirror.toDataURL())
					//}
				} else {
				    if (currentRadius < startRadius) {
					    ctx.clearRect(0, 0, canvas.width, canvas.height);
						ctx_mirror.drawImage(imageObj, 0, 0, mywidth, myheight);
						ctx_mirror.fillStyle = 'red';
						ctx_mirror.globalAlpha=0.4;
						ctx_mirror.beginPath();
						if (mirror) {
							ctx_mirror.arc(mywidth - xend, myheight - yend, endRadius, 0, 2 * Math.PI, false);
						} else {
							ctx_mirror.arc(xend, yend, endRadius, 0, 2 * Math.PI, false);
						}
						 ctx_mirror.fill();
						ctx_mirror.globalAlpha=1
						
						drawing = true;
						finished = false;
						startTime = new Date();
						ctx_mirror.beginPath();
						if (mirror) {
							ctx_mirror.moveTo(mywidth-mouse.x, myheight-mouse.y);
						} else {
							ctx_mirror.moveTo(mouse.x, mouse.y);
						}
					}
				}
			}
			
	}, false);
	 
	 
	var onPaint = function() {
			if(mirror) {
			ctx_mirror.lineTo(mywidth-mouse.x, myheight-mouse.y);
			} else {
			ctx_mirror.lineTo(mouse.x, mouse.y);
			}
			ctx_mirror.stroke();
	};
	
	
function findPos(obj) {
    var curleft = 0, curtop = 0;
    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
        return { x: curleft, y: curtop };
    }
    return undefined;
}

function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255)
        throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}

function saveCanvas() {

	// Get the canvas screenshot as PNG
	var screenshot = Canvas2Image.saveAsPNG(canvas_mirror, true);

	// This is a little trick to get the SRC attribute from the generated <img> screenshot
	canvas_mirror.parentNode.appendChild(screenshot);
	screenshot.id = "canvasimage";		
	data = $('#canvasimage').attr('src');
	canvas_mirror.parentNode.removeChild(screenshot);

  
	// Send the screenshot to PHP to save it on the server
	var url = saveScript;
    $.ajax({ 
	    type: "POST", 
	    url: url,
	    dataType: 'text',
	    data: {
		id : MID,
		trial : trialnumber,
		score : score,
		distance_inline : distance_inline,
		distance_offline : distance_offline,
		timeDiff : timeDiff,
		crossings : crossings,
		base64data : data
	    }
	});
}

}