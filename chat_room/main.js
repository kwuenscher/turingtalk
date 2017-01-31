var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var portNum = 3000;

app.get('/', function(req, res){
	res.sendFile(__dirname + '/front_page.html');
});

app.get('/front_page.css', function(req, res){
	res.sendFile(__dirname + '/front_page.css');
});

app.get('/images/turingCirkel.png', function(req, res){
	res.sendFile(__dirname + '/images/turingCirkel.png');
});

io.on('connection', function(socket){
	socket.on('create room', function(){
		var spawn = require('child_process').spawn;
		var child = spawn('node',['index.js', portNum]);
		socket.emit('goto room', portNum++);
	});
});

http.listen(2000,function(){
	console.log("Server started");
});