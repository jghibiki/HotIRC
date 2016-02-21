'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
    'ngRoute',
    'ngResource',
    'btford.socket-io',
    'myApp.view1',
    'myApp.view2',
    'myApp.version'
]).
config(['$routeProvider', function($routeProvider) {
    $routeProvider.otherwise({redirectTo: '/view1'});
}]).
factory('socket', function (socketFactory) {
    return socketFactory({
      ioSocket: io.connect(':8000')
    });
});
