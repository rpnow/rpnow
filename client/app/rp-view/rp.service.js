'use strict';

angular.module('rpnow')

.factory('rpService', ['$http', 'io', 'localStorageService', function($http, io, localStorageService) {
    return function(rpCode) { return new RP(rpCode); };

    function RP(rpCode) {
        var rp = this;
        rp.rpCode = rpCode;
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

        class Message {
            constructor(data) {
                for (let prop in data) this[prop] = data[prop];
            }

            get id() {
                return rp.msgs.indexOf(this);
            }

            get chara() {
                return rp.charas[this.charaId];
            }

            get canEdit() {
                return challenge && this.challenge === challenge.hash;
            }

            get color() {
                return this.chara ? this.chara.color : null;
            }

            edit(newContent, callback) {
                this.sending = true;
                this.content = newContent;
                challegePromise.then(() => {
                    let data = {
                        id: this.id,
                        content: newContent,
                        secret: challenge.secret
                    }
                    socket.emit('edit message', data, (err, receivedMsg) => {
                        if (err) return;
                        this.onEdited(receivedMsg);
                        this.sending = false;
                        if (callback) callback();
                    });
                });
            }

            onEdited(data) {
                for (let prop in data) this[prop] = data[prop];
            }
        }

        socket.on('rp error', function(err) {
            rp.loading = false;
            rp.loadError = err.code;
        })

        socket.on('load rp', function(data) {
            rp.loading = false;
            for (var prop in data) {
                rp[prop] = data[prop];
            }
            rp.msgs = rp.msgs.map(msg => new Message(msg));
        });

        socket.on('add message', function(msg) {
            rp.msgs.push(new Message(msg));
        });
        socket.on('add character', function(chara) {
            rp.charas.push(chara);
        });
        socket.on('edit message', function(data) {
            rp.msgs[data.id].onEdited(data.msg);
        });

        rp.addMessage = function(msg, callback) {
            var placeholderMsg = new Message(msg);
            placeholderMsg.sending = true;
            rp.msgs.push(placeholderMsg);

            challegePromise.then(() => {
                msg.challenge = challenge.hash;
                socket.emit('add message', msg, function(err, data) {
                    if (err) return;
                    rp.msgs.splice(rp.msgs.indexOf(placeholderMsg),1);
                    rp.msgs.push(new Message(data));
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
                rp.msgs.push(new Message(receivedMsg));
                if (callback) callback();
            });
        };

        rp.exit = function() {
            socket.close();
        };

    }
}])
