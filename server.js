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
    console.log("New Connection");

    socket.on("newSession", function(sessionInfo){
        console.log("Attempting to initiate new session");

        ircSession = new irc.Client(sessionInfo.server, sessionInfo.nick, {
        });

        ircSession.addListener("error", function(error){
            console.log("IRC Error: " + error);
        });

        ircSession.join(sessionInfo.channel, function(){

            ircSession.addListener('message'+sessionInfo.channel, function(from, message){
                console.log("11");
                sessions[socket.ircSessionId].servers[sessionInfo.server][sessionInfo.channel].push({
                    from: from,
                    message: message
                });

                console.log("12");
                socket.emit("newState",{
                    servers: sessions[socket.ircSessionId].servers
                });
                console.log("13");
            });


            socket.ircSessionId = sessions.length;

            var servers = {};
            servers[sessionInfo.server] = {}
            servers[sessionInfo.server][sessionInfo.channel] = []
            console.log("3");

            sessions.push({
                servers: servers,
                client: ircSession
            });

            socket.emit("initialized");

            socket.emit("newState",{
                servers: sessions[socket.ircSessionId].servers
            });
        });
    });

    socket.on("newMessage", function(message){
        console.log("9");
        console.log(socket.ircSessionId);
        sessions[socket.ircSessionId][message.server][message.channel].push(message);
        sessions[socket.ircSessionId].client.say(message.channel, message.content);
        console.log("10");
    });

    socket.on("error", function(error){
        console.log("Error: " + error);
    });
});




