const config = require('./config');

config.set('logLevel', 'warn');
const port = config.get('port');
const host = `http://localhost:${port}`;

const io = require('socket.io-client');
const request = require('request');
const nJ = require('normalize-json');
const api = require('./index');

const errorSchema = nJ({
    code: [String],
    details: [{ $optional: String }],
});
const msgSchema = nJ({
    _id: [String],
    type: ['narrator', 'chara', 'ooc'],
    content: [String, 10000],
    charaId: msg => (msg.type === 'chara' ? [String] : undefined),
    timestamp: [Number],
    ipid: [String],
    challenge: [String],
});
const imageMsgSchema = nJ({
    _id: [String],
    type: ['image'],
    url: [String],
    timestamp: [Number],
    ipid: [String],
});
const rpCodeSchema = nJ({
    rpCode: [String],
});
const emptyRoomSchema = nJ({
    title: [String],
    desc: [{ $optional: String }],
    msgs: [Array, false],
    charas: [Array, false],
});
const challengeSchema = nJ({
    secret: [String],
    hash: [String],
});
const fullRoomSchema = nJ({
    title: [String],
    desc: [{ $optional: String }],
    msgs: [Array, msgSchema.requirements],
    charas: [Array, false],
});

// shortcut to open up an RP, providing the socket, message-challenge, and
//  (if not provided,) the RP code.
function openRoom(rpCode, callback) {
    request.get(`${host}/api/challenge.json`, { json: true }, (err, res, data) => {
        const challenge = data;
        const socket = io(host, { query: `rpCode=${rpCode}` });
        socket.on('load rp', (rp) => {
            callback({
                socket, challenge, rpCode, rp,
            });
        });
    });
}

// like openRoom, but creates a new room
function openNewRoom(callback) {
    request.post({ uri: `${host}/api/rp.json`, json: true, body: { title: 'Test RP' } }, (err, res, data) => {
        openRoom(data.rpCode, callback);
    });
}

// specs start here
describe('basic socket.io message coverage', () => {
    beforeEach(() => jasmine.addMatchers(nJ.jasmineMatchers));

    let socket;
    let rpCode;
    let challenge;
    let messageToEditLater;
    let charaId;

    it('will give the rp code when created', (done) => {
        request.post({ uri: `${host}/api/rp.json`, json: true, body: { title: 'Test RP' } }, (err, res, data) => {
            expect(err).toBeFalsy();
            expect(res.statusCode).toBe(201);
            expect(data).toFitSchema(rpCodeSchema);
            ({ rpCode } = data);
            done();
        });
    });

    it('gets a secret token', (done) => {
        request.get(`${host}/api/challenge.json`, { json: true }, (err, res, data) => {
            expect(err).toBeFalsy();
            expect(res.statusCode).toBe(200);
            expect(data).toFitSchema(challengeSchema);
            challenge = data;
            done();
        });
    });

    it('will give an error when an invalid rpCode is requested', (done) => {
        io(host, { query: 'rpCode=badcode1' })
            .on('rp error', (err) => {
                expect(err).toFitSchema(errorSchema);
                done();
            });
    });

    it('will give the blank rp when requested', (done) => {
        socket = io(host, { query: `rpCode=${rpCode}` })
            .on('load rp', (data) => {
                expect(data).toFitSchema(emptyRoomSchema);
                done();
            });
    });

    it('accepts new chara', (done) => {
        const chara = { name: 'Cassie', color: '#ca551e' };
        socket.emit('add character', chara, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema({
                _id: [String],
                name: ['Cassie'],
                color: ['#ca551e'],
            });
            charaId = data._id;
            done();
        });
    });

    it('accepts narrator message', (done) => {
        const msg = { type: 'narrator', content: 'Narrator message text.', challenge: challenge.hash };
        socket.emit('add message', msg, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(msgSchema);
            expect(data.type).toBe('narrator');
            expect(data.content).toEqual(msg.content);
            expect(data.challenge).toEqual(challenge.hash);
            messageToEditLater = data;
            done();
        });
    });

    it('accepts ooc message', (done) => {
        const msg = { type: 'ooc', content: 'OOC message text.', challenge: challenge.hash };
        socket.emit('add message', msg, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(msgSchema);
            expect(data.type).toBe('ooc');
            expect(data.content).toEqual(msg.content);
            expect(data.challenge).toEqual(challenge.hash);
            done();
        });
    });

    it('accepts chara message', (done) => {
        const msg = {
            type: 'chara', content: 'Hello!', charaId, challenge: challenge.hash,
        };
        socket.emit('add message', msg, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(msgSchema);
            expect(data.type).toBe('chara');
            expect(data.content).toEqual(msg.content);
            expect(data.challenge).toEqual(challenge.hash);
            expect(data.charaId).toBe(charaId);
            done();
        });
    });

    it('accepts image', (done) => {
        const url = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
        socket.emit('add image', url, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(imageMsgSchema);
            expect(data.url).toEqual(url);
            done();
        });
    });

    it('edits a message', (done) => {
        const input = { id: messageToEditLater._id, content: 'Edited!', secret: challenge.secret };
        socket.emit('edit message', input, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toEqual({ ...messageToEditLater, content: 'Edited!', edited: data.edited });

            // make sure other users sees the right stuff
            openRoom(rpCode, ({ rp }) => {
                expect(rp.msgs.find(m => m._id === messageToEditLater._id)).toEqual(data);
                done();
            });
        });
    });

    it('closes its connection', (done) => {
        socket.on('disconnect', () => {
            done();
        });
        socket.close();
    });
});

describe('Malformed data resistance within an RP', () => {
    beforeEach(() => jasmine.addMatchers(nJ.jasmineMatchers));

    let socket;
    let challenge;

    it('will open up a room', (done) => {
        openNewRoom((data) => {
            ({ socket, challenge } = data);
            done();
        });
    });

    it('will reject malformed socket.io requests', (done) => {
        socket.emit(1);
        socket.emit('hi');
        socket.emit(false);
        socket.emit(() => {});

        ['add message', 'add character', 'edit message', 'add image'].forEach((msgType) => {
            socket.emit(msgType, { title: 'Kill Server' }, 'not a function');
            socket.emit(msgType, 'Kill Server');
            socket.emit(msgType, undefined);
        });

        const healthCheckMsg = { type: 'narrator', content: 'Are you alive?', challenge: challenge.hash };
        socket.emit('add message', healthCheckMsg, (err, data) => {
            expect(err).toBeFalsy();
            expect(data).toFitSchema(msgSchema);
            done();
        });
    });

    [undefined, null, false, true, 0, 1, {}, [], '', ' ', '       ', 'NAME LONGER THAN THIRTY CHARACTERS'].forEach((badName) => {
        it(`rejects chara with bad name: '${badName}'`, (done) => {
            socket.emit('add character', { name: badName, color: '#123456' }, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });

    [undefined, null, false, true, 0, 1, {}, [], '', '#abc', '#abcdef1', '#ABCD3F', 'abcd3f', '#abcdef#123456', 'rgba(0,0,0,0)', 'red'].forEach((badColor) => {
        it(`rejects chara with bad color: '${badColor}'`, (done) => {
            socket.emit('add character', { name: 'Cassie', color: badColor }, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });

    [undefined, null, false, true, 0, 1, {}, [], '', ' ', '       '].forEach((badContent) => {
        it(`rejects message with bad content: '${badContent}'`, (done) => {
            socket.emit('add message', { type: 'narrator', content: badContent, challenge: challenge.hash }, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });
    it('rejects message with too-long content', (done) => {
        const longContent = Array(10000 + 1 + 1).join('a');
        socket.emit('add message', { type: 'narrator', content: longContent, challenge: challenge.hash }, (err, data) => {
            expect(err).toFitSchema(errorSchema);
            expect(data).not.toBeDefined();
            done();
        });
    });

    [undefined, null, false, true, 0, 1, {}, [], '', ' ', 'oooc', 'oocc', 'ooc   ', 'OOC', 'oocnarrator', 'image'].forEach((badType) => {
        it(`rejects message with bad type: '${badType}'`, (done) => {
            socket.emit('add message', { type: badType, content: 'Hello', challenge: challenge.hash }, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });

    [undefined, null, false, true, {}, [], '0', -1, 1, 0.5, -0.5].forEach((badCharaId) => {
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
    });

    it('rejects non-chara message with charaId in it', (done) => {
        socket.emit('add character', { name: 'Good Chara', color: '#123456' }, (err, data) => {
            expect(err).toBeFalsy();
            const charaId = data._id;
            socket.emit('add message', {
                type: 'chara', charaId, content: 'Hello', challenge: challenge.hash,
            }, (err) => {
                expect(err).toBeFalsy();
                socket.emit('add message', {
                    type: 'ooc', charaId, content: 'Hello', challenge: challenge.hash,
                }, (err, data) => {
                    expect(err).toFitSchema(errorSchema);
                    expect(data).not.toBeDefined();
                    done();
                });
            });
        });
    });

    [
        undefined, null, false, true, 0, 1, {}, [], '', ' ', '       ',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAhElEQVRIie2WwQrAIAxDU/H/fzk7CdHVwdYWdjCXipQX04NqJIlCdVkbAG5q2EAh3NSQgUJCJxaeAaAm+DqONaEpp22a3mgCrrwmTVG5jIwEj8pM4HKa15WpY3AM/m3AagOrNrglyLouJp4aZF1400u4vmhZJmMa7IiPxvsojH1Y9bflAvhRIjH91XRBAAAAAElFTkSuQmC',
        'http://baduri.rpnow.net',
    ].forEach((badUrl) => {
        it(`rejects image with bad url: '${badUrl}'`, (done) => {
            socket.emit('add image', badUrl, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });

    [undefined, null, false, true, {}, [], 0, -1, 2, 0.5, -0.5].forEach((badId) => {
        it(`rejects edits with bad id: '${badId}'`, (done) => {
            const input = { id: badId, content: 'Edited!', secret: challenge.secret };
            socket.emit('edit message', input, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });

    [undefined, null, false, true, 0, 1, {}, [], '', ' ', '       '].forEach((badContent) => {
        it(`rejects edits with bad content: '${badContent}'`, (done) => {
            const input = { id: 0, content: badContent, secret: challenge.secret };
            socket.emit('edit message', input, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });

    [undefined, null, false, true, 0, 1, {}, [], '', ' ', '       '].forEach((badSecret) => {
        it(`rejects edits with bad challenge secret: '${badSecret}'`, (done) => {
            const input = { id: 0, content: 'Edited!', secret: badSecret };
            socket.emit('edit message', input, (err, data) => {
                expect(err).toFitSchema(errorSchema);
                expect(data).not.toBeDefined();
                done();
            });
        });
    });

    it('closes its connection', (done) => {
        socket.on('disconnect', () => {
            done();
        });
        socket.close();
    });
});

describe('multiple clients', () => {
    beforeEach(() => jasmine.addMatchers(nJ.jasmineMatchers));

    const users = [];
    let rpCode;

    let chat;

    it('will open up a room', (done) => {
        openNewRoom((data) => {
            users.push(data);
            ({ rpCode } = data);
            done();
        });
    });

    it('have a friend join the same room', (done) => {
        openRoom(rpCode, (data) => {
            users.push(data);
            done();
        });
    });

    it('have someone else create a separate room', (done) => {
        openNewRoom((data) => {
            users.push(data);
            done();
        });
    });

    it('send and receive many messages in order, but only within the same room', (done) => {
        const numMsgs = 4;
        let waiters = 0;

        let chat1;
        let chat2;
        let chatOtherRoom;

        function check() {
            expect(chat1.length).toBeGreaterThan(numMsgs - 1);
            expect(chat2.length).toBeGreaterThan(numMsgs - 1);
            expect(chatOtherRoom.length).toBe(0);
            expect(JSON.stringify(chat1)).toEqual(JSON.stringify(chat2));
            chat = chat1;
            done();
        }

        function startMockClient(user, active) {
            const msgs = [];

            function sendOne() {
                const message = { type: 'narrator', content: `hello${Math.floor(Math.random() * 1000)}!`, challenge: user.challenge.hash };
                user.socket.emit('add message', message, (err, data) => {
                    expect(err).toBeFalsy();
                    msgs.push(data);
                    if (msgs.length < numMsgs) setTimeout(sendOne, Math.random() * 100);
                    else if (!--waiters) setTimeout(check, 1000);
                });
            }

            user.socket.on('add message', (msg) => {
                msgs.push(msg);
            });

            if (active) {
                ++waiters;
                sendOne();
            }

            return msgs;
        }

        chat1 = startMockClient(users[0], true);
        chat2 = startMockClient(users[1], true);
        chatOtherRoom = startMockClient(users[2], false);
    });

    it('have a third friend join and get the whole rp', (done) => {
        openRoom(rpCode, (data) => {
            users.push(data);
            expect(data.rp).toFitSchema(fullRoomSchema);
            expect(data.rp.msgs).toEqual(chat);
            done();
        });
    });

    it('close all the sockets', (done) => {
        let remainingClients = users.length;
        users.forEach((user) => {
            user.socket.on('disconnect', () => {
                if (!--remainingClients) done();
            });
            user.socket.close();
        });
    });
});

xdescribe('web server (after running all tests)', () => {
    xit('can be stopped', (done) => {
        api.stop(() => {
            const socket = io(host);
            socket.on('connect_error', () => {
                socket.close();
                done();
            });
        });
    });
});
