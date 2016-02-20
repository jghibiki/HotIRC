var express = require('express');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var bodyParser = require("body-parser");
var irc = require('irc');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(8000, "0.0.0.0");
console.log('\n=========================================\n  _    _       _   _____ _____   _____ \n | |  | |     | | |_   _|  __ \\ / ____|\n | |__| | ___ | |_  | | | |__) | |     \n |  __  |/ _ \\| __| | | |  _  /| |     \n | |  | | (_) | |_ _| |_| | \\ \\| |____ \n |_|  |_|\\___/ \\__|_____|_|  \\_\\\\_____|\n=========================================');
console.log("Listening on port 8000.")
app.use(express.static("./app"))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var router = express.Router();

//Define routes

app.use("/api", router)

sessions = []

io.on('connection', function(socket){ 
    socket.on("newSession", function(sessionInfo){
        ircSession = new irc.Client(sessionInfo.server, sessionInfo.nick, {
            channels: [sessionInfo.channel]
        });

        ircSession.addListener('message'+sessionInfo.channel, function(from, message){
            sessions[socket.ircSessionId].servers[sessionInfo.server][sessionInfo.channel].push({
                from: from,
                message: message
            });
        });
    });

});




