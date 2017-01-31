var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var activeIds = [];
var eliminated = [];
var roomFilled = false;
var allColours = ['rgba(253, 99, 240, 0.62)','rgba(68, 88, 245, 0.62)','rgba(255, 53, 53, 0.62)','rgba(255, 53, 53, 0.62)','rgba(45, 116, 115, 0.62)'];
var colourSet = ['rgba(253, 99, 240, 0.62)','rgba(68, 88, 245, 0.62)','rgba(255, 53, 53, 0.62)','rgba(255, 53, 53, 0.62)','rgba(45, 116, 115, 0.62)'];
var colourToId = {};

var gameOver = false;
var guesserId;
var maxNumClients = 4;

var botIndex = Math.floor(Math.random() * (maxNumClients + 1));
var botColour = colourSet[botIndex];
colourSet.splice(botIndex,1);

var guesserWon;

app.get('/', function(req, res){
  if (!roomFilled){
	res.sendFile(__dirname + '/chat.html');
  }
  else {
	res.sendFile(__dirname + '/roomfilled.html');
  }
});

app.get('/chat.css', function(req, res){
	res.sendFile(__dirname + '/chat.css');
});

app.get('/you_win.css', function(req, res){
	if (guesserWon && gameOver){
		res.sendFile(__dirname + '/you_win.css');
	}
});

app.get('/you_win.html', function(req, res){
	if (guesserWon && gameOver){
		res.sendFile(__dirname + '/you_win.html');
	}
});

app.get('/you_lose.css', function(req, res){
	if (gameOver){
		res.sendFile(__dirname + '/you_lose.css');
	}
});

app.get('/you_lose.html', function(req, res){
	if (gameOver){
		res.sendFile(__dirname + '/you_lose.html');
	}
});

app.get('/images/turing_pics04.gif', function(req, res){
	if (guesserWon && gameOver){
		res.sendFile(__dirname + '/images/turing_pics04.gif');
	}
});

app.get('/images/background.gif', function(req, res){
	if (gameOver){
		res.sendFile(__dirname + '/images/background.gif');
	}
});

app.get('/images/turing_sad.gif', function(req, res){
	if (gameOver){
		res.sendFile(__dirname + '/images/turing_sad.gif');
	}
});

app.get('/roomfilled.css', function(req, res){
	res.sendFile(__dirname + '/roomfilled.css');
});

app.get('/images/roomfilled.png', function(req, res){
	res.sendFile(__dirname + '/images/roomfilled.png');
});

app.get('/images/halfturing_halfMachine.png', function(req, res){
	if (gameOver && !guesserWon){
		res.sendFile(__dirname + '/images/halfturing_halfMachine.png');
	}
});

app.get('/bots_win.css', function(req, res){
	if (gameOver && !guesserWon){
		res.sendFile(__dirname + '/bots_win.css');
	}
});

app.get('/bots_win.html', function(req, res){
	if (gameOver && !guesserWon){
		res.sendFile(__dirname + '/bots_win.html');
	}
});

io.on('connection', function(socket){
  activeIds.push(socket.id);

  var index = Math.floor(Math.random() * ((maxNumClients + 1) - activeIds.length));
  var colour = colourSet[index];
  colourSet.splice(index,1);
  colourToId[colour] = socket.id;

  if (activeIds.length < maxNumClients) {
	  io.to(socket.id).emit("colours_notassigned", maxNumClients-(activeIds.length));
  }

  if (activeIds.length === maxNumClients){
	roomFilled = true;
	var guessableColours = [];
	for (col of allColours){
		if (col !== botColour){
			guessableColours.push(col);
		}
	}
	var guesserColour = guessableColours[Math.floor(Math.random() * 4)];
	guesserId = colourToId[guesserColour];
	guessableColours = [];
	for (col of allColours){
		if (col !== guesserColour){
			guessableColours.push(col);
		}
	}

	io.emit('colours_assigned');
	io.to(guesserId).emit('you_are_guesser');
	for (player of activeIds) {
		if (player !== guesserId) {
			io.to(player).emit('you_are_not_guesser');
		}
	}
	io.to(guesserId).emit('guesser', guessableColours);
  }


  socket.on('chat message', function(msg){
	if (eliminated.indexOf(socket.id) === -1){
		for (userId of activeIds) {
			io.to(userId).emit('chat message', [msg, ((!roomFilled) ? 'gray' : colour), ((guesserId === socket.id) ? 'bold' : 'normal'), (userId !== socket.id)]);
		}
		for (userId of eliminated) {
			io.to(userId).emit('chat message', [msg, ((!roomFilled) ? 'gray' : colour), ((guesserId === socket.id) ? 'bold' : 'normal'), (userId !== socket.id)]);
		}

      if (Math.random() < 0.4 && roomFilled){
        var spawn = require('child_process').spawn;
        var py = spawn('python', ['chatbot.py']);
        var dataString = '';

        py.stdout.on('data', function(data){
          dataString += data.toString();
          // console.log("triggered")
        });
        py.stdout.on('end', function(){
          // console.log(dataString);
        	if (!gameOver){

        	  io.emit('chat message', [dataString, botColour, 'normal']);
        	}
        });
  		  py.stdin.write(JSON.stringify(msg));
  		  py.stdin.end();
      }
	}
	else {
	  socket.emit('out of game', msg);
	}
  });

  socket.on('voted', function(chosen){
	if (socket.id !== guesserId || gameOver) return;
	if (activeIds.indexOf(colourToId[chosen]) > -1){
		for (userId of activeIds){
			if (userId === colourToId[chosen]){
				io.to(userId).emit('been eliminated');
			}
			else {
				io.to(userId).emit('eliminate', chosen);
			}
		}
		for (userId of eliminated){
			io.to(userId).emit('eliminate', chosen);
		}
		eliminated.push(colourToId[chosen]);
		activeIds.splice(activeIds.indexOf(colourToId[chosen]), 1);
		gameOver = true;
		guesserWon = false;
		setTimeout(function(){
			for (userId of activeIds){
				io.to(userId).emit('end game', [(userId === guesserId), guesserWon]);
			}
			for (userId of eliminated){
				io.to(userId).emit('end game', [(userId === guesserId), guesserWon]);
			}
		}, 2500);
	}
	else if (chosen === botColour){
		io.emit('bot selected');
		gameOver = true;
		guesserWon = true;
		setTimeout(function(){
			for (userId of activeIds){
				io.to(userId).emit('end game', [(userId === guesserId), guesserWon]);
			}
			for (userId of eliminated){
				io.to(userId).emit('end game', [(userId === guesserId), guesserWon]);
			}
		}, 2500);
	}
	else {
		socket.emit('inactive', chosen);
	}
  });

  socket.on('disconnect', function(msg){
	if (activeIds.indexOf(socket.id) > -1){
	  activeIds.splice(activeIds.indexOf(socket.id), 1);
	}
	else if (eliminated.indexOf(socket.id) > -1){
	  eliminated.splice(eliminated.indexOf(socket.id), 1);
	}
	colourSet.push(colour);
  });
});

http.listen(process.argv[2], function(){
  console.log('listening on *:' + process.argv[2]);
});
