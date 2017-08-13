'use strict';

angular.module('rpnow')

.factory('rpService', ['$http', 'io', 'globalSetting', function($http, io, globalSetting) {
    return {
        rp: (rpCode) => new Promise(rpPromiseHandler.bind(null, rpCode))
    };

    function rpPromiseHandler(rpCode, resolve, reject) {
        var rp = {};
        rp.rpCode = rpCode;

        var socket = io('/', { query: 'rpCode='+rp.rpCode });

        var challenge = { secret: null, hash: null };
        globalSetting(challenge, 'secret', 'challenge.secret');
        globalSetting(challenge, 'hash', 'challenge.hash');

        var challengePromise = new Promise(function(resolve, reject) {
            if (challenge.secret) return resolve();

            $http.get('/api/challenge.json').then(function(res) {
                challenge.secret = res.data.secret;
                challenge.hash = res.data.hash;
                resolve();
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
                challengePromise.then(() => {
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

        class Chara {
            constructor(data) {
                for (let prop in data) this[prop] = data[prop];
            }

            get id() {
                return rp.charas.indexOf(this);
            }
        }

        socket.on('rp error', function(err) {
            reject(err.code)
        })

        socket.on('load rp', function(data) {
            for (var prop in data) {
                rp[prop] = data[prop];
            }
            rp.msgs = rp.msgs.map(msg => new Message(msg));
            rp.charas = rp.charas.map(chara => new Chara(chara));
            resolve(rp);
        });

        socket.on('add message', function(msg) {
            msg = new Message(msg);
            rp.msgs.push(msg);
            if (rp.onNewMessage) rp.onNewMessage(msg);
        });
        socket.on('add character', function(chara) {
            rp.charas.push(new Chara(chara));
        });
        socket.on('edit message', function(data) {
            rp.msgs[data.id].onEdited(data.msg);
        });

        rp.addMessage = function(msg, callback) {
            var placeholderMsg = new Message(msg);
            placeholderMsg.sending = true;
            rp.msgs.push(placeholderMsg);

            challengePromise.then(() => {
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
            socket.emit('add character', chara, function(err, data) {
                if (err) return;
                rp.charas.push(new Chara(data));
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
        rp.onNewMessage = null;

        rp.exit = function() {
            socket.close();
        };

    }
}])
