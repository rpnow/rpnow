'use strict';

angular.module('rpnow')

.factory('rpService', ['$http', 'io', 'localStorageService', function($http, io, localStorageService) {
    return function(rpCode) { return new RP(rpCode); };

    function RP(rpCode) {
        var rp = this;
        rp.rpCode = rpCode || (location.href.split('#')[0]).split('/').pop();
        rp.loading = true;
        rp.loadError = null;

        var socket = io('/', { query: 'rpCode='+rp.rpCode });

        var challenge = null;
        var challegePromise = new Promise(function(resolve, reject) {
            if (localStorageService.isSupported && localStorageService.get('challenge.secret')) {
                resolve(challenge = {
                    secret: localStorageService.get('challenge.secret') || null,
                    hash: localStorageService.get('challenge.hash') || null
                });
            }
            else $http.get('/api/challenge.json').then(function(res) {
                resolve(challenge = res.data);
                localStorageService.set('challenge.secret', challenge.secret);
                localStorageService.set('challenge.hash', challenge.hash);
            });
        });

        socket.on('rp error', function(err) {
            rp.loading = false;
            rp.loadError = err.code;
        })

        socket.on('load rp', function(data) {
            rp.loading = false;
            for (var prop in data) {
                rp[prop] = data[prop];
            }
        });

        socket.on('add message', function(msg) {
            rp.msgs.push(msg);
        });
        socket.on('add character', function(chara) {
            rp.charas.push(chara);
        });
        socket.on('edit message', function(data) {
            rp.msgs.splice(data.id,1, data.msg);
        });

        rp.addMessage = function(msg, callback) {
            var placeholderMsg = JSON.parse(JSON.stringify(msg));
            placeholderMsg.sending = true;
            rp.msgs.push(placeholderMsg);

            challegePromise.then(() => {
                msg.challenge = challenge.hash;
                socket.emit('add message', msg, function(err, receivedMsg) {
                    if (err) return;
                    rp.msgs.splice(rp.msgs.indexOf(placeholderMsg),1);
                    rp.msgs.push(receivedMsg);
                    if (callback) callback();
                });
            });
        };
        rp.addChara = function(chara, callback) {
            socket.emit('add character', chara, function(err, receivedChara) {
                if (err) return;
                rp.charas.push(receivedChara);
                if (callback) callback();
            });
        };
        rp.addImage = function(url, callback) {
            socket.emit('add image', url, function(err, receivedMsg) {
                if (err) return callback(err);
                rp.msgs.push(receivedMsg);
                if (callback) callback();
            });
        };

        rp.editMessage = function(editInfo, callback) {
            rp.msgs[editInfo.id].sending = true;
            challegePromise.then(() => {
                editInfo.secret = challenge.secret;
                socket.emit('edit message', editInfo, function(err, receivedMsg) {
                    if (err) return;
                    rp.msgs.splice(editInfo.id,1, receivedMsg);
                    if (callback) callback();
                });
            });
        };

        rp.canEdit = function(msg) {
            return msg.challenge === challenge.hash;
        }

        rp.exit = function() {
            socket.close();
        };

    }
}])
