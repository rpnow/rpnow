'use strict';

angular.module('rpnow')

// https://stackoverflow.com/questions/14389049/
.factory('io', ['$rootScope', function($rootScope) {
    return function() {
        var socket = io.apply(io, arguments);
        return {
            emit: function(type, data, callback) {
                socket.emit(type, data, function() {
                    if (callback) callback.apply(socket, arguments);
                    $rootScope.$apply();
                })
            },
            on: function(type, callback) {
                socket.on(type, function() {
                    callback.apply(socket, arguments);
                    $rootScope.$apply();
                })
            },
            close: function() {
                socket.close();
            }
        };
    }
}])