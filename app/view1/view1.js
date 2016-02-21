'use strict';

angular.module('myApp.view1', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/view1', {
    templateUrl: 'view1/view1.html',
    controller: 'View1Ctrl'
  });
}])

.controller('View1Ctrl', ["$scope", "socket", function($scope, socket) {

    $scope.nick = "";
    $scope.channel = "";
    $scope.nickPassword = "";
    $scope.sessionPassword = "";
    $scope.server = "irc.freenode.net";
    $scope.initialized = false;
    $scope.newSession = true;
    $scope.servers = [];
    $scope.channelNames = [];
    $scope.channelMessages = [];


    $scope.sendUserMessage = function(){
        if($scope.initialized){
            if($scope.userMessage.match(/^\/whois \w+/i)){
                var command = $scope.userMessage.replace("/","").split(" ");
                console.log(command);

                socket.emit("/whois", {
                    state: {
                        server: $scope.server,
                        channel: $scope.channel,
                        servers: $scope.servers,
                        nick: $scope.nick
                    },
                    who: command[1]
                });

            }
            else if($scope.userMessage.match(/^\/reload/i)){
                socket.emit("/reload", {
                    state: {
                        server: $scope.server,
                        channel: $scope.channel,
                        servers: $scope.servers,
                        nick: $scope.nick
                    },
                });

            }
            else if($scope.userMessage.match(/^\/(\w)(\w| )*/i)){

                var command = $scope.userMessage.replace("/","").split(" ");
                command[0] = command[0].toUpperCase();

                socket.emit("send", {
                    state: {
                        server: $scope.server,
                        channel: $scope.channel,
                        servers: $scope.servers,
                        nick: $scope.nick
                    },
                    command: command
                });
            }
            else{
                socket.emit("newMessage", {
                    from: $scope.nick, 
                    content: $scope.userMessage,
                    server: $scope.server,
                    channel: $scope.channel
                });
                $scope.userMessage = ""
            }
        }
        else{
            alert("You must set a nick before you can send a message!");
        }
    }


    $scope.initialize = function(){
        if($scope.newSession){
            socket.emit("newSession", {
                server: $scope.server,
                channel: $scope.channel,
                nick: $scope.nick,
                nickPassword: $scope.nickPassword,
                sessionPassword: $scope.sessionPassword
            });
            $scope.nickPassword = "";
            $scope.sessionPassword = "";
        }
        else{
            socket.emit("resumeSession", {
                nick: $scope.nick,
                sessionPassword: $scope.sessionPassword
            });
            $scope.sessionPassword = "";
        }

        if(Notification.permission !== 'denied'){
            Notification.requestPermission();
        }
    }

    socket.on("initialized", function(){
        $scope.initialized = true;
    });

    socket.on("newState", function(state){
        if($scope.initialized){

            if($scope.server === ""){
                if(Object.keys(state.servers).length > 0){
                    $scope.server = Object.keys(state.servers)[0];
                }
            }
            if($scope.channel === ""){
                if(Object.keys(state.servers[$scope.server]).length > 0){
                    $scope.channel = Object.keys(state.servers[$scope.server])[0];
                }
            }
            
            //count new messages
            var newMsgsCt = 0;

            Object.keys(state.servers).forEach(function(server_key){
                Object.keys(state.servers[server_key]).forEach(function(channel_key){
                    if($scope.servers.hasOwnProperty(server_key) 
                            && $scope.servers[server_key].hasOwnProperty(channel_key)){
                        newMsgsCt += (state.servers[server_key][channel_key].messages.length 
                                    - $scope.servers[server_key][channel_key].messages.length);
                    }
                    else{
                        newMsgsCt += state.servers[server_key][channel_key].messages.length
                    }
                });
            });
            if(newMsgsCt === 1){
                var newMsg = state.servers[$scope.server][$scope.channel].messages.filter(
                        function(el){
                            var found = false;
                            if($scope.servers.hasOwnProperty($scope.server) 
                                    && $scope.servers[$scope.server].hasOwnProperty($scope.channel)){
                                $scope.servers[$scope.server][$scope.channel].messages.forEach(function(msg){
                                    if(msg.from == el.from && msg.content == el.content){
                                        found = true;
                                    }
                                });
                            }
                            return !found; 
                })[0];
                
                if(newMsg.from !== $scope.nick){
                    var notification = new Notification(newMsg.from + ": " + newMsg.content);
                    setTimeout(function(){notification.close();}, 10000);
                }
            }
            else{
                if(newMsgsCt > 0){
                    var notification = new Notification("You have " + newMsgsCt + " new messages");
                    setTimeout(function(){notification.close();}, 10000);
                }
            }

            $scope.servers = state.servers;

            if($scope.servers.hasOwnProperty($scope.server) 
                    && $scope.servers[$scope.server].hasOwnProperty($scope.channel)){
                $scope.channelMessages = $scope.servers[$scope.server][$scope.channel].messages;
                $scope.channelNames = $scope.servers[$scope.server][$scope.channel].names;
            }
            else{
                $scope.channelMessages = [];
            }
        }
    });


    $scope.logoff = function(){
        console.log("Ending Session");

        //Deinitialize
        $scope.nick = "";
        $scope.channel = "";
        $scope.nickPassword = "";
        $scope.sessionPassword = "";
        $scope.server = "irc.freenode.net";
        $scope.initialized = false;
        $scope.newSession = true;
        $scope.servers = [];
        $scope.channelMessages = [];

        socket.emit("endSession");
    }


    
}]);
