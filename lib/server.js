
var express = require('express');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var bodyParser = require("body-parser");
var irc = require('irc');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

module.exports = function(opts){

    server.listen(opts.port, opts.host);
    console.log("Listening on port " + opts.port + ".")
    app.use(express.static("./app"))
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    sessions = []

    io.on('connection', function(socket){ 
        if(opts.dev) console.log("New Connection");

        socket.on("newSession", function(sessionInfo){
            if(opts.dev) console.log("Attempting to initiate new session");

            ircSession = new irc.Client(sessionInfo.server, sessionInfo.nick, {
                debug: debug
            });

            ircSession.addListener("registered", function(){

                ircSession.addListener("error", function(error){
                    if(opts.dev) console.log("IRC Error: " + error.args[0] + ":" + error.args[1]);
                });

                if(sessionInfo.nickPassword !== ""){
                    ircSession.say("NickServ", "identify " + sessionInfo.nickPassword);
                }

                ircSession.join(sessionInfo.channel, function(){

                    socket.ircSessionId = sessions.length;

                    var servers = {};
                    servers[sessionInfo.server] = {}
                    servers[sessionInfo.server][sessionInfo.channel] = {}
                    servers[sessionInfo.server][sessionInfo.channel].messages = []
                    servers[sessionInfo.server][sessionInfo.channel].nicks = []

                    sessions.push({
                        servers: servers,
                        info: sessionInfo,
                        client: ircSession
                    });

                    if(debug){
                        ircSession.addListener("raw", function(message){
                            if(opts.dev) console.log(JSON.stringify(message));
                        });
                    }

                    var listener = 'message'+sessionInfo.channel
                    if(opts.dev) console.log("Adding channel listener " + listener)
                    ircSession.addListener(listener, function(from, message, extra){
                        if(opts.dev) console.log(sessionInfo.channel + ":" + from + ": " + message);
                        sessions[socket.ircSessionId].servers[sessionInfo.server][sessionInfo.channel].messages.push({
                            time: new Date(),
                            from: from,
                            content: message,
                            server: sessionInfo.server,
                            channel: sessionInfo.channel
                        });

                        newState(sessionInfo.server, sessionInfo.channel);
                    });

                    ircSession.addListener('names'+sessionInfo.channel, function(nicks) {
                        sessions[socket.ircSessionId].servers[sessionInfo.server][sessionInfo.channel].names = nicks;    
                    });
                    ircSession.addListener('join'+sessionInfo.channel, function(who, reason, message) {
                        sessions[socket.ircSessionId].servers[sessionInfo.server][sessionInfo.channel].messages.push({
                            time: new Date(),
                            from: "NOTICE",
                            content: who + " has joined " + sessionInfo.channel + ".",
                            server: sessionInfo.server,
                            channel: sessionInfo.channel
                        })
                        newState(sessionInfo.server, sessionInfo.channel);
                    });
                    ircSession.addListener('part'+sessionInfo.channel, function(who, reason, message) {
                        sessions[socket.ircSessionId].servers[sessionInfo.server][sessionInfo.channel].messages.push({
                            time: new Date(),
                            from: "NOTICE",
                            content: who + " has parted " + sessionInfo.channel + ".",
                            server: sessionInfo.server,
                            channel: sessionInfo.channel
                        })
                        newState(sessionInfo.server, sessionInfo.channel);
                    });
                    ircSession.addListener('kick'+sessionInfo.channel, function(who, by, reason, message) {
                        sessions[socket.ircSessionId].servers[sessionInfo.server][sessionInfo.channel].messages.push({
                            time: new Date(),
                            from: "NOTICE",
                            content: by + " has kicked " + who + " from " + sessionInfo.channel + ". Reason: " + reason,
                            server: sessionInfo.server,
                            channel: sessionInfo.channel
                        })
                        newState(sessionInfo.server, sessionInfo.channel);
                    });

                    ircSession.addListener('selfMessage', function(to, text){
                        if(!sessions[socket.ircSessionId].servers[sessionInfo.server].hasOwnProperty(to)){
                            sessions[socket.ircSessionId].servers[sessionInfo.server][to].messages = []
                            sessions[socket.ircSessionId].servers[sessionInfo.server][to].nicks = []

                        }
                        sessions[socket.ircSessionId].servers[sessionInfo.server][to].messages.push({
                            time: new Date(),
                            from: sessionInfo.nick,
                            content: message.content,
                            server: sessionInfo.server,
                            channel: message.to                        
                        });

                    });

                    socket.emit("initialized");

                    newState(sessionInfo.server, sessionInfo.channel);
                });
            });
        });

        socket.on("resumeSession", function(credentials){
            if(opts.dev) console.log("Attempting to resume session.");

            sessions.forEach(function(session){
                if(session.info.nick === credentials.nick 
                        && session.info.sessionPassword === credentials.sessionPassword){

                    socket.ircSessionId = sessions.indexOf(session);

                    socket.emit("initialized");

                    var server = Object.keys(session.servers)[0];
                    var channel = Object.keys(session.servers[server])[0];
                    newState(server, channel);
                }
            });
        });

        socket.on("newMessage", function(message){
            if(opts.dev) console.log("New Message in Session: " + socket.ircSessionId + "\"" + message.content + "\"");
            message.date = new Date();
            sessions[socket.ircSessionId].servers[message.server][message.channel].messages.push(message);
            sessions[socket.ircSessionId].client.say(message.channel, message.content);

            newState(message.server, message.channel);
        });

        socket.on("/reload", function(args){
            if(opts.dev) console.log("Reload remote state");
            newState(args.state.server, args.state.channel);
        });

        socket.on("send", function(message){
            if(opts.dev) console.log("Sending command " + message.command);
            sessions[socket.ircSessionId].client.send.apply(sessions[socket.ircSessionId].client, message.command);
        });

        socket.on("/whois", function(args){
            if(opts.dev) console.log("Running whois query for " + args.who);
            sessions[socket.ircSessionId].client.whois(args.who, function(response){
                if(opts.dev) console.log(response);

                sessions[socket.ircSessionId].servers[args.state.server][args.state.channel].messages.push({
                    time: new Date(),
                    from: "WHOIS [" + response.nick + "]",
                    content: "Nick: " + response.nick,
                    server: args.state.server,
                    channel: args.state.channel
                })

                sessions[socket.ircSessionId].servers[args.state.server][args.state.channel].messages.push({
                    time: new Date(),
                    from: "WHOIS [" + response.nick + "]",
                    content: "Host: " + response.host,
                    server: args.state.server,
                    channel: args.state.channel
                })

                sessions[socket.ircSessionId].servers[args.state.server][args.state.channel].messages.push({
                    time: new Date(),
                    from: "WHOIS [" + response.nick + "]",
                    content: "Real Name: " + response.realname,
                    channel: args.state.channel
                })

                sessions[socket.ircSessionId].servers[args.state.server][args.state.channel].messages.push({
                    time: new Date(),
                    from: "WHOIS [" + response.nick + "]",
                    content: "Server: " + response.server, 
                    channel: args.state.channel
                })
                
                
                newState(args.state.server, args.state.channel);
            });

        });

        socket.on("/msg", function(message){
            if(opts.dev) console.log("Sending Private Message to " + message.to + ".");
            sessions[socket.ircSessionId].client.say(message.to, message.content);
            
            //should add a new listener to this private message thread if one does not exist

        });


        socket.on("error", function(error){
            console.log("Error: " + error);
        });

        socket.on("endSession", function(){
            sessions[socket.ircSessionId].client.disconnect(function(){
                sessions[socket.ircSessionId].client = null;
                sessions[socket.ircSessionId].servers = null;
                sessions[socket.ircSessionId].info = null;
            });
        });

        var newState = function(server, channel){
            sessions[socket.ircSessionId].servers[server][channel].names = Object.keys(sessions[socket.ircSessionId].client.chans[channel].users)
            socket.emit("newState",{
                servers: sessions[socket.ircSessionId].servers
            });
            
        }
    });



}
