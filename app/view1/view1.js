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
    $scope.server = "";
    $scope.initialized = false;
    $scope.newSession = true;
    $scope.servers = [];


    $scope.sendUserMessage = function(){
        if($scope.nick !== "" && $scope.initialized){
            socket.emit("newMessage", {from: $scope.nick, content:$scope.userMessage});
        }
        else{
            alert("You must set a nick before you can send a message!");
        }
    }

    $scope.initialize = function(){
        if($scope.newSession){
            $scope.initialized = true;
            socket.emit("startSession", {
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
            $scope.initialized = true;
            socket.emit("resumeSession", {
                nick: $scope.nick,
                nickPassword: $scope.nickPassword
            });
            $scope.nickPassword = "";
        }
    }

    socket.on("newState", function(state){
        if($scope.initialized){
            $scope.servers = state.servers;
            $scope.nick = state.server;
        }
        if($scope.server === ""){
            if(Object.keys($scope.servers).length > 0){
                $scope.server = Object.keys($scope.servers)[0];
            }
        }
        if($scope.channel === ""){
            if(Object.keys($scope.servers[$scope.server]).length > 0){
                $scope.server = Object.keys($scope.servers[$scope.server])[0];
            }
        }
    });




    
}]);
