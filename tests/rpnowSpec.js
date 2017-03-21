/* global describe it expect */
const PORT_NUM = 8282;
const host = `http://localhost:${PORT_NUM}`;

const request = require('request');
const io = require('socket.io-client');
const normalize = require('../src/server/normalize-json');
const rpnow = require('../src/server/server');

const customMatchers = {
    toFitSchema: () => ({
        compare: (obj, schema) => {
            var test = normalize(obj, schema);

            return {
                pass: test.valid,
                message: test.valid? 
                     `Expected ${JSON.stringify(obj) || obj} to fail the spec`:
                     `Expected ${JSON.stringify(obj) || obj} to pass: nJ says "${test.error}"`
            };
        }
    }),
};

describe("web server", () => {
    const options = { port: PORT_NUM, logging: false };
    
    it("is not already running", (done) => {
        request(`${host}/`, (err, res, body) => {
            expect(err).toBeTruthy();
            done();
        });
    });
    
    it("can be started", (done) => {
        rpnow.start(options, () => {
            request(`${host}/`, (err, res, body) => {
                expect(err).toBeFalsy();
                expect(res).toBeDefined();
                expect(res && res.statusCode).toBe(200);
                done();
            });
        });
    });
    
    it("can be stopped", (done) => {
        rpnow.stop(() => {
            request(`${host}/`, (err, res, body) => {
                expect(err).toBeTruthy();
                done();
            });
        });
    });
    
    it("can be started again", (done) => {
        rpnow.start(options, () => {
            request(`${host}/`, (err, res, body) => {
                expect(err).toBeFalsy();
                expect(res).toBeDefined();
                expect(res.statusCode).toBe(200);
                done();
            });
        });
    });
});

describe("single-page app file serving", () => {
    const badMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const pageUrls = [`/`, `/rp/aaaaaaaa`, `/about`, `/terms`, `/invalid`];
    const resourceUrls = [`/app/index.html`, `/app/home.template.html`, `/app/app.js`, `/sounds/alert.mp3`, `/robots.txt`];
    let pageResponses = {};

    pageUrls.concat(resourceUrls).forEach(url => {
        it(`will give a 200 status for GET-ing the resource: ${url}`, (done) => {
            request({ uri: `${host}${url}`, method: 'GET'}, (err, res, body) => {
                expect(err).toBeFalsy();
                expect(res.statusCode).toBe(200);
                pageResponses[url] = body;
                done();
            });
        });
        badMethods.forEach(method => {
            it(`will give a 404 status for other HTTP request type "${method}" for ${url}`, (done) => {
                request({ uri: `${host}${url}`, method: method }, (err, res, body) => {
                    expect(err).toBeFalsy();
                    expect(res.statusCode).toBe(404);
                    done();
                });
            });
        });
    });
    it(`will not respond to invalid HTTP request types`, (done) => {
        request({ uri: `${host}/`, method: 'INVALID'}, (err, res, body) => {
            expect(err).toBeTruthy();
            done();
        });
    });

    it(`will give the same page body for each SPA url`, () => {
        pageUrls.forEach(url => {
            expect(pageResponses[url]).toEqual(pageResponses['/app/index.html']);
        })
    });
    it('will not serve the SPA index for static resources', () => {
        resourceUrls.forEach(url => {
            if (url !== '/app/index.html') {
                expect(pageResponses[url]).not.toEqual(pageResponses['/app/index.html']);
            }
        })
    })

});

describe("basic socket.io message coverage", () => {
    const socket = io(host);
    let rpCode = null;

    beforeEach(() => jasmine.addMatchers(customMatchers));
    
    it("will give the rp code when created", (done) => {
        socket.emit('create rp', { title: 'Test RP'}, (data) => {
            expect(data).toFitSchema({ rpCode: [String] });
            rpCode = data.rpCode;
            done();
        })
    });
    
    it("will give an error when an invalid rpCode is requested", (done) => {
        socket.emit('enter rp', 'badcode1', (data) => {
            expect(data).toFitSchema({ error: [String] });
            done();
        });
    });
    
    it("will give the blank rp when requested", (done) => {
        socket.emit('enter rp', rpCode, (data) => {
            expect(data).toFitSchema({
                title: [ String ],
                desc: [ {$optional:String} ],
                msgs: [ Array, false ],
                charas: [ Array, false ]
            });
            done();
        });
    });
    
    it("accepts new chara", (done) => {
        let chara = { name: 'Cassie', color: '#ca551e' };
        socket.emit('add character', chara, (data) => {
            expect(data).toFitSchema({
                name: ['Cassie'],
                color: ['#ca551e']
            })
            done();
        });
    });
    
    it("accepts narrator message", (done) => {
        let msg = { type: 'narrator', content: 'Narrator message text.' };
        socket.emit('add message', msg, (data) => {
            expect(data).toFitSchema({
                type: ['narrator'],
                content: [msg.content],
                timestamp: [Number],
                ipid: [String]
            })
            done();
        });
    });
    
    it("accepts ooc message", (done) => {
        let msg = { type: 'ooc', content: 'OOC message text.' };
        socket.emit('add message', msg, (data) => {
            expect(data).toFitSchema({
                type: ['ooc'],
                content: [msg.content],
                timestamp: [Number],
                ipid: [String]
            })
            done();
        });
    });
    
    it("accepts chara message", (done) => {
        let msg = { type: 'chara', content: 'Hello!', charaId: 0 };
        socket.emit('add message', msg, (data) => {
            expect(data).toFitSchema({
                type: ['chara'],
                content: [msg.content],
                charaId: [0],
                timestamp: [Number],
                ipid: [String]
            })
            done();
        });
    });

    it("leaves the room succesfully", (done) => {
        socket.emit('exit rp', rpCode, (data) => {
            expect(data).toFitSchema({ })
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

    beforeEach(() => jasmine.addMatchers(customMatchers));

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

        socket.emit('create rp', { title: 'Are you still alive'}, (data) => {
            expect(data).toFitSchema({ rpCode: [String] });
            done();
        });
    })
    
    it("will create and join an RP for testing", (done) => {
        socket.emit('create rp', { title: 'Test RP'}, (data) => {
            expect(data).toFitSchema({ rpCode: [String] });
            socket.emit('enter rp', data.rpCode, (data) => {
                expect(data).toFitSchema({
                    title: [ String ],
                    desc: [ {$optional:String} ],
                    msgs: [ Array, false ],
                    charas: [ Array, false ]
                });
                done();
            });
        });
    });

    [undefined, null, false, true, 0, 1, {}, [], '', ' ', '       ', 'NAME LONGER THAN THIRTY CHARACTERS'].forEach(badName => {
        it(`rejects chara with bad name: '${badName}'`, (done) => {
            socket.emit('add character', {name: badName, color: '#123456'}, (data) => {
                expect(data).toFitSchema({ error: [ String ] });
                done();
            });
        });
    });
    
    [undefined, null, false, true, 0, 1, {}, [], '', '#abc', '#abcdef1', '#ABCD3F', 'abcd3f', '#abcdef#123456', 'rgba(0,0,0,0)', 'red'].forEach(badColor => {
        it(`rejects chara with bad color: '${badColor}'`, (done) => {
            socket.emit('add character', {name: 'Cassie', color: badColor}, (data) => {
                expect(data).toFitSchema({ error: [ String ] });
                done();
            });
        });
    });
    
    [undefined, null, false, true, 0, 1, {}, [], '', ' ', '       '].forEach(badContent => {
        it(`rejects message with bad content: '${badContent}'`, (done) => {
            socket.emit('add message', { type: 'narrator', content: badContent }, (data) => {
                expect(data).toFitSchema({ error: [ String ] });
                done();
            });
        });
    });
    it('rejects message with too-long content', (done) => {
        var longContent = Array(10000 + 1 + 1).join('a');
        socket.emit('add message', { type: 'narrator', content: longContent }, (data) => {
            expect(data).toFitSchema({ error: [ String ] });
            done();
        });
    });
    
    [undefined, null, false, true, 0, 1, {}, [], '', ' ', 'oooc', 'oocc', 'ooc   ', 'OOC', 'oocnarrator'].forEach(badType => {
        it(`rejects message with bad type: '${badType}'`, (done) => {
            socket.emit('add message', { type: badType, content: 'Hello' }, (data) => {
                expect(data).toFitSchema({ error: [ String ] });
                done();
            });
        });
    });
    
    [undefined, null, false, true, {}, [], '0', -1, 1, 0.5, -0.5].forEach(badCharaId => {
        it(`rejects message with bad charaId: '${badCharaId}'`, (done) => {
            socket.emit('add message', { type: 'chara', charaId: badCharaId, content: 'Hello' }, (data) => {
                expect(data).toFitSchema({ error: [ String ] });
                done();
            });
        });
    });

    it('rejects chara message with missing charaId', (done) => {
        socket.emit('add message', { type: 'chara', content: 'Hello' }, (data) => {
            expect(data).toFitSchema({ error: [ String ] });
            done();
        });
    })

    it('rejects non-chara message with charaId in it', (done) => {
        socket.emit('add character', {name:'Good Chara', color: '#123456'}, (data) => {
            expect(data.error).not.toBeDefined();
            socket.emit('add message', { type: 'chara', charaId: 0, content: 'Hello' }, (data) => {
                expect(data.error).not.toBeDefined();
                socket.emit('add message', { type: 'ooc', charaId: 0, content: 'Hello' }, (data) => {
                    expect(data).toFitSchema({ error: [ String ] });
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

    beforeEach(() => jasmine.addMatchers(customMatchers));

    it("initiates and enters a room", (done) => {
        sockets[0].emit('create rp', { title: 'Test RP'}, (data) => {
            expect(data).toFitSchema({ rpCode: [String] });
            rpCode = data.rpCode;
            sockets[0].emit('enter rp', rpCode, (data) => {
                expect(data).toFitSchema({
                    title: [ String ],
                    desc: [ {$optional:String} ],
                    msgs: [ Array, false ],
                    charas: [ Array, false ]
                });
                done();
            });
        });
    });

    it("have a friend join the same room", (done) => {
        sockets[1].emit('enter rp', rpCode, (data) => {
            expect(data).toFitSchema({
                title: [ String ],
                desc: [ {$optional:String} ],
                msgs: [ Array, false ],
                charas: [ Array, false ]
            });
            done();
        });
    });

    it("have someone else create a separate room", (done) => {
        sockets[3].emit('create rp', { title: 'Other RP'}, (data) => {
            expect(data).toFitSchema({ rpCode: [String] });
            sockets[3].emit('enter rp', data.rpCode, (data) => {
                expect(data).toFitSchema({
                    title: [ String ],
                    desc: [ {$optional:String} ],
                    msgs: [ Array, false ],
                    charas: [ Array, false ]
                });
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
                socket.emit('add message', message, (data) => {
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
            expect(JSON.stringify(chat1)).toEqual(JSON.stringify(chat2));
            chat = chat1;
            done();
        }

    });

    it("have a third friend join and get the whole rp", (done) => {
        sockets[2].emit('enter rp', rpCode, (data) => {
            expect(data).toFitSchema({
                title: [ String ],
                desc: [ {$optional:String} ],
                msgs: [ Array, {
                    type: ['narrator'],
                    content: [String],
                    timestamp: [Number],
                    ipid: [String]
                }],
                charas: [ Array, false ]
            })
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

    beforeEach(() => jasmine.addMatchers(customMatchers));

    it("sends an error when exiting an rp before entering it", (done) => {
        socket.emit('create rp', { title: 'Test RP'}, (data) => {
            expect(data).toFitSchema({ rpCode: [String] });
            rpCode = data.rpCode;
            socket.emit('exit rp', rpCode, (data) => {
                expect(data).toFitSchema({ error: [String] });
                done();
            });
        });
    });

    it("sends an error when sending a message before entering an rp", (done) => {
        socket.emit('add message', {type:'ooc', content:'hello'}, (data) => {
            expect(data).toFitSchema({ error: [String] });
            done();
        });
    });

    it("sends an error when sending a character message before entering an rp", (done) => {
        socket.emit('add message', {type:'chara', content:'hello', charaId: 0}, (data) => {
            expect(data).toFitSchema({ error: [String] });
            done();
        });
    });

    it("sends an error when adding a chara before entering an rp", (done) => {
        socket.emit('add character', {name:'buddy', color:'#123456'}, (data) => {
            expect(data).toFitSchema({ error: [String] });
            done();
        });
    });

    it("sends an error when entering the same RP twice", (done) => {
        socket.emit('enter rp', rpCode, (data) => {
            socket.emit('enter rp', rpCode, (data) => {
                expect(data).toFitSchema({ error: [String] });
                done();
            });
        });
    });

    it("sends an error when trying to join a second RP", (done) => {
        socket.emit('create rp', { title: 'Test RP 2'}, (data) => {
            expect(data).toFitSchema({ rpCode: [String] });
            socket.emit('enter rp', data.rpCode, (data) => {
                expect(data).toFitSchema({ error: [String] });
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
        rpnow.stop(() => {
            request(`${host}/`, (err, res, body) => {
                expect(err).toBeTruthy();
                done();
            });
        });
    });
});