/* global describe it expect */
const port = require('../constants').port;
const host = `http://localhost:${port}`;

const io = require('socket.io-client');
const api = require('../api');
api.logging = false;

const schemaMatchers = require('./support/schemaMatchers');
const errorSchema = {
    code: [String],
    details: [{$optional:String}]
};
const msgSchema = {
    type: ['narrator', 'chara', 'ooc'],
    content: [String, 10000],
    charaId: (msg)=> msg.type === 'chara' ? [ Number, 0, Infinity ] : undefined,
    timestamp: [Number],
    ipid: [String],
    challenge: [String],
    secret: [String]
}
const friendMsgSchema = {
    type: ['narrator', 'chara', 'ooc'],
    content: [String, 10000],
    charaId: (msg)=> msg.type === 'chara' ? [ Number, 0, Infinity ] : undefined,
    timestamp: [Number],
    ipid: [String],
    challenge: [String]
}
const rpCodeSchema = {
    rpCode: [ String ]
}
const emptyRoomSchema = {
    title: [ String ],
    desc: [ {$optional:String} ],
    msgs: [ Array, false ],
    charas: [ Array, false ]
}
const fullRoomSchema = {
    title: [ String ],
    desc: [ {$optional:String} ],
    msgs: [ Array, friendMsgSchema ],
    charas: [ Array, false ]
}

describe("basic socket.io message coverage", () => {
    const socket = io(host);
    let rpCode = null;

    beforeEach(() => jasmine.addMatchers(schemaMatchers.matchers));
    
    it("will give the rp code when created", (done) => {
        socket.emit('create rp', { title: 'Test RP'}, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(rpCodeSchema);
            rpCode = data.rpCode;
            done();
        })
    });
    
    it("will give an error when an invalid rpCode is requested", (done) => {
        socket.emit('enter rp', 'badcode1', (err, data) => {
            expect(err).toFitSchema(errorSchema);
            expect(data).not.toBeDefined();
            done();
        });
    });
    
    it("will give the blank rp when requested", (done) => {
        socket.emit('enter rp', rpCode, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(emptyRoomSchema);
            done();
        });
    });
    
    it("accepts new chara", (done) => {
        let chara = { name: 'Cassie', color: '#ca551e' };
        socket.emit('add character', chara, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema({
                name: ['Cassie'],
                color: ['#ca551e']
            })
            done();
        });
    });
    
    it("accepts narrator message", (done) => {
        let msg = { type: 'narrator', content: 'Narrator message text.' };
        socket.emit('add message', msg, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(msgSchema);
            expect(data.type).toBe('narrator');
            expect(data.content).toEqual(msg.content);
            done();
        });
    });
    
    it("accepts ooc message", (done) => {
        let msg = { type: 'ooc', content: 'OOC message text.' };
        socket.emit('add message', msg, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(msgSchema);
            expect(data.type).toBe('ooc');
            expect(data.content).toEqual(msg.content);
            done();
        });
    });
    
    it("accepts chara message", (done) => {
        let msg = { type: 'chara', content: 'Hello!', charaId: 0 };
        socket.emit('add message', msg, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(msgSchema);
            expect(data.type).toBe('chara');
            expect(data.content).toEqual(msg.content);
            expect(data.charaId).toBe(0);
            done();
        });
    });

    it("leaves the room succesfully", (done) => {
        socket.emit('exit rp', rpCode, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).not.toBeDefined();
            done();
        });
    });

    it("closes its connection", (done) => {
        socket.on('disconnect', () => {
            done();
        });
        socket.close();
    });
});

describe("Malformed data resistance", () => {
    const socket = io(host);

    beforeEach(() => jasmine.addMatchers(schemaMatchers.matchers));

    it("will reject malformed socket.io requests", (done) => {
        socket.emit(1);
        socket.emit('hi');
        socket.emit(false);
        socket.emit(function(){});

        ['create rp', 'enter rp', 'exit rp', 'add message', 'add character'].forEach(msgType => {
            socket.emit(msgType, { title: 'Kill Server'}, 'not a function');
            socket.emit(msgType, 'Kill Server');
            socket.emit(msgType, undefined);
        })

        socket.emit('create rp', { title: 'Are you still alive'}, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(rpCodeSchema);
            done();
        });
    })
    
    it("will create and join an RP for testing", (done) => {
        socket.emit('create rp', { title: 'Test RP'}, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(rpCodeSchema);
            socket.emit('enter rp', data.rpCode, (err, data) => {
                expect(err).toBeFalsy();
                expect(data).toFitSchema(emptyRoomSchema);
                done();
            });
        });
    });

    [undefined, null, false, true, 0, 1, {}, [], '', ' ', '       ', 'NAME LONGER THAN THIRTY CHARACTERS'].forEach(badName => {
        it(`rejects chara with bad name: '${badName}'`, (done) => {
            socket.emit('add character', {name: badName, color: '#123456'}, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });
    
    [undefined, null, false, true, 0, 1, {}, [], '', '#abc', '#abcdef1', '#ABCD3F', 'abcd3f', '#abcdef#123456', 'rgba(0,0,0,0)', 'red'].forEach(badColor => {
        it(`rejects chara with bad color: '${badColor}'`, (done) => {
            socket.emit('add character', {name: 'Cassie', color: badColor}, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });
    
    [undefined, null, false, true, 0, 1, {}, [], '', ' ', '       '].forEach(badContent => {
        it(`rejects message with bad content: '${badContent}'`, (done) => {
            socket.emit('add message', { type: 'narrator', content: badContent }, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });
    it('rejects message with too-long content', (done) => {
        var longContent = Array(10000 + 1 + 1).join('a');
        socket.emit('add message', { type: 'narrator', content: longContent }, (err, data) => {
            expect(err).toFitSchema(errorSchema);
            expect(data).not.toBeDefined();
            done();
        });
    });
    
    [undefined, null, false, true, 0, 1, {}, [], '', ' ', 'oooc', 'oocc', 'ooc   ', 'OOC', 'oocnarrator'].forEach(badType => {
        it(`rejects message with bad type: '${badType}'`, (done) => {
            socket.emit('add message', { type: badType, content: 'Hello' }, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });
    
    [undefined, null, false, true, {}, [], '0', -1, 1, 0.5, -0.5].forEach(badCharaId => {
        it(`rejects message with bad charaId: '${badCharaId}'`, (done) => {
            socket.emit('add message', { type: 'chara', charaId: badCharaId, content: 'Hello' }, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });

    it('rejects chara message with missing charaId', (done) => {
        socket.emit('add message', { type: 'chara', content: 'Hello' }, (err, data) => {
            expect(err).toFitSchema(errorSchema);
            expect(data).not.toBeDefined();
            done();
        });
    })

    it('rejects non-chara message with charaId in it', (done) => {
        socket.emit('add character', {name:'Good Chara', color: '#123456'}, (err, data) => {
            expect(err).toBeFalsy();
            socket.emit('add message', { type: 'chara', charaId: 0, content: 'Hello' }, (err, data) => {
                expect(err).toBeFalsy();
                socket.emit('add message', { type: 'ooc', charaId: 0, content: 'Hello' }, (err, data) => {
                    expect(err).toFitSchema(errorSchema);
                    expect(data).not.toBeDefined();
                    done();
                });
            });
        });
    })

    it("closes its connection without leaving the room", (done) => {
        socket.on('disconnect', () => {
            done();
        });
        socket.close();
    });
    
});

describe("multiple clients", () => {
    let sockets = [];
    for(let i = 0; i < 4; ++i) sockets.push(io(host));

    let rpCode;
    let chat;

    beforeEach(() => jasmine.addMatchers(schemaMatchers.matchers));

    it("initiates and enters a room", (done) => {
        sockets[0].emit('create rp', { title: 'Test RP'}, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(rpCodeSchema);
            rpCode = data.rpCode;
            sockets[0].emit('enter rp', rpCode, (err, data) => {
                expect(err).toBeFalsy();
                expect(data).toFitSchema(emptyRoomSchema);
                done();
            });
        });
    });

    it("have a friend join the same room", (done) => {
        sockets[1].emit('enter rp', rpCode, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(emptyRoomSchema);
            done();
        });
    });

    it("have someone else create a separate room", (done) => {
        sockets[3].emit('create rp', { title: 'Other RP'}, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(rpCodeSchema);
            sockets[3].emit('enter rp', data.rpCode, (err, data) => {
                expect(err).toBeFalsy();
                expect(data).toFitSchema(emptyRoomSchema);
                done();
            });
        });
    });

    it("send and receive many messages in order, but only within the same room", (done) => {
        let waiters = 2;

        let chat1 = startMockClient(sockets[0], true);
        let chat2 = startMockClient(sockets[1], true);
        let chatOtherRoom = startMockClient(sockets[3], false);

        function startMockClient(socket, active) {
            let msgs = [];

            function sendOne() {
                let message = {'type': 'narrator', 'content': 'hello'+Math.floor(Math.random()*1000)+'!'};
                socket.emit('add message', message, (err, data) => {
                    expect(err).toBeFalsy();
                    msgs.push(data);
                    if (msgs.length < 20) setTimeout(sendOne, Math.random() * 100);
                    else if (!--waiters) setTimeout(check, 1000);
                })
            }

            socket.on('add message', (msg) => {
                msgs.push(msg);
            })

            if (active) sendOne();

            return msgs;
        }

        function check() {
            expect(chat1.length).toBeGreaterThan(20-1);
            expect(chat2.length).toBeGreaterThan(20-1);
            expect(chatOtherRoom.length).toBe(0);
            expect(JSON.stringify(chat1)).not.toEqual(JSON.stringify(chat2));
            chat1.forEach(msg=>delete msg.secret);
            chat2.forEach(msg=>delete msg.secret);
            expect(JSON.stringify(chat1)).toEqual(JSON.stringify(chat2));
            chat = chat1;
            done();
        }

    });

    it("have a third friend join and get the whole rp", (done) => {
        sockets[2].emit('enter rp', rpCode, (err, data) => {
            expect(data).toFitSchema(fullRoomSchema);
            expect(JSON.stringify(data.msgs)).toEqual(JSON.stringify(chat));
            done();
        });
    });
    
    it("close all the sockets", (done) => {
        let remainingClients = sockets.length;
        sockets.forEach(socket => {
            socket.on('disconnect', () => {
                if (!--remainingClients) done();
            })
            socket.close();
        });
    });
});

describe("bad event order handling", () => {
    const socket = io(host);
    let rpCode = null;

    beforeEach(() => jasmine.addMatchers(schemaMatchers.matchers));

    it("sends an error when exiting an rp before entering it", (done) => {
        socket.emit('create rp', { title: 'Test RP'}, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(rpCodeSchema);
            rpCode = data.rpCode;
            socket.emit('exit rp', rpCode, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });

    it("sends an error when sending a message before entering an rp", (done) => {
        socket.emit('add message', {type:'ooc', content:'hello'}, (err, data) => {
            expect(err).toFitSchema(errorSchema);
            expect(data).not.toBeDefined();
            done();
        });
    });

    it("sends an error when sending a character message before entering an rp", (done) => {
        socket.emit('add message', {type:'chara', content:'hello', charaId: 0}, (err, data) => {
            expect(err).toFitSchema(errorSchema);
            expect(data).not.toBeDefined();
            done();
        });
    });

    it("sends an error when adding a chara before entering an rp", (done) => {
        socket.emit('add character', {name:'buddy', color:'#123456'}, (err, data) => {
            expect(err).toFitSchema(errorSchema);
            expect(data).not.toBeDefined();
            done();
        });
    });

    it("sends an error when entering the same RP twice", (done) => {
        socket.emit('enter rp', rpCode, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toBeTruthy();
            socket.emit('enter rp', rpCode, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });

    it("sends an error when trying to join a second RP", (done) => {
        socket.emit('create rp', { title: 'Test RP 2'}, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(rpCodeSchema);
            socket.emit('enter rp', data.rpCode, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    })

    it("closes its connection without leaving the room", (done) => {
        socket.on('disconnect', () => {
            done();
        });
        socket.close();
    });
});

describe("web server (after running all tests)", () => {
    it("can be stopped", (done) => {
        api.stop(() => {
            let socket = io(host);
            socket.on('connect_error', (error) => {
                done();
                socket.close();
            });
        });
    });
});