/* global describe it expect */
const PORT_NUM = 8282;
const host = `http://localhost:${PORT_NUM}`;

const request = require('request');
const io = require('socket.io-client');
const rpnow = require('../src/server/server');

describe("web server", () => {
   const options = { port: PORT_NUM, logging: false, rateLimit: false };
   
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
   var badMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
   var pageUrls = [`/`, `/rp/aaaaaaaa`, `/about`, `/terms`, `/invalid`];
   var resourceUrls = [`/app/index.html`, `/app/home.template.html`, `/app/app.js`, `/alert.mp3`, `/robots.txt`];
   var pageResponses = {};

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
   var rpCode = null;
   var socket;

   socket = io(host);
   
   it("will give the rp code when created", (done) => {
      socket.emit('create rp', { title: 'Test RP'}, (data) => {
         expect(data.error).not.toBeDefined();
         expect(data.rpCode).toBeDefined();
         rpCode = data.rpCode;
         done();
      })
   });
   
   it("will give an error when an invalid rpCode is requested", (done) => {
      socket.emit('enter rp', 'badcode1', (data) => {
         expect(data.error).toBeDefined();
         expect(data._id).not.toBeDefined();
         expect(data.title).not.toBeDefined();
         done();
      });
   });
   
   it("will give the blank rp when requested", (done) => {
      socket.emit('enter rp', rpCode, (data) => {
         expect(data.error).not.toBeDefined();
         expect(data._id).not.toBeDefined();
         expect(data.title).toBe('Test RP');
         expect(data.msgs.length).toBe(0);
         expect(data.charas.length).toBe(0);
         done();
      });
   });
   
   it("accepts new chara", (done) => {
      let chara = { name: 'Cassie', color: '#ca551e' };
      socket.emit('add character', chara, (data) => {
         expect(data.error).not.toBeDefined();
         expect(data._id).not.toBeDefined();
         expect(data.name).toBe('Cassie');
         expect(data.color).toBe('#ca551e');
         done();
      });
   });
   
   it("accepts narrator message", (done) => {
      let msg = { type: 'narrator', content: 'Narrator message text.' };
      socket.emit('add message', msg, (data) => {
         expect(data.error).not.toBeDefined();
         expect(data._id).not.toBeDefined();
         expect(data.type).toBe('narrator');
         expect(data.content).toEqual(msg.content);
         expect(data.chara).not.toBeDefined();
         done();
      });
   });
   
   it("accepts ooc message", (done) => {
      let msg = { type: 'ooc', content: 'OOC message text.' };
      socket.emit('add message', msg, (data) => {
         expect(data.error).not.toBeDefined();
         expect(data._id).not.toBeDefined();
         expect(data.type).toBe('ooc');
         expect(data.content).toEqual(msg.content);
         expect(data.chara).not.toBeDefined();
         done();
      });
   });
   
   it("accepts chara message", (done) => {
      let msg = { type: 'chara', content: 'Hello!', chara: {name:'Cassie',color:'#ca551e'} };
      socket.emit('add message', msg, (data) => {
         expect(data.error).not.toBeDefined();
         expect(data._id).not.toBeDefined();
         expect(data.type).toBe('chara');
         expect(data.content).toEqual(msg.content);
         expect(data.chara.name).toBe('Cassie');
         expect(data.chara.color).toBe('#ca551e');
         done();
      });
   });

   it("leaves the room succesfully", (done) => {
      socket.emit('exit rp', rpCode, (data) => {
         expect(data.error).not.toBeDefined();
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

/*
xdescribe("POST constraints within an RP", () => {
   var rpCode = null;
   
   it("will create a new RP for message testing", (done) => {
      request.post({ uri: `${api}/rps.json`, json: true, body: { title: "Test RP" } }, (err, res, body) => {
         expect(err).toBeFalsy();
         rpCode = body.rpCode;
         expect(res.statusCode).toBe(201);
         done();
      });
   });
   
   [undefined, null, false, true, 0, 1, {}, [], '', ' ', '       ', 'NAME LONGER THAN THIRTY CHARACTERS'].forEach(badName => {
      it(`rejects chara with bad name: '${badName}'`, (done) => {
         request.post({ uri: `${api}/rps/${rpCode}/chara.json`, json: true, body: { name: badName, color: '#ca551e' } }, (err, res, body) => {
            expect(err).toBeFalsy();
            expect(res.statusCode).toBe(400);
            done();
         });
      });
   });
   
   [undefined, null, false, true, 0, 1, {}, [], '', '#abc', '#abcdef1', 'abcd3f', '#abcdef#123456', 'rgba(0,0,0,0)', 'red'].forEach(badColor => {
      it(`rejects chara with bad color: '${badColor}'`, (done) => {
         request.post({ uri: `${api}/rps/${rpCode}/chara.json`, json: true, body: { name: 'Cassie', color: badColor } }, (err, res, body) => {
            expect(err).toBeFalsy();
            expect(res.statusCode).toBe(400);
            done();
         });
      });
   });
   
   [undefined, null, false, true, 0, 1, {}, [], '', ' ', '       '].forEach(badContent => {
      it(`rejects message with bad content: '${badContent}'`, (done) => {
         request.post({ uri: `${api}/rps/${rpCode}/chara.json`, json: true, body: { type: 'narrator', content: badContent } }, (err, res, body) => {
            expect(err).toBeFalsy();
            expect(res.statusCode).toBe(400);
            done();
         });
      });
   });
   it('rejects message with too-long content', (done) => {
      var longContent = Array(10000 + 1 + 1).join('a');
      request.post({ uri: `${api}/rps/${rpCode}/chara.json`, json: true, body: { type: 'narrator', content: longContent } }, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(400);
         done();
      });
   });
   
   [undefined, null, false, true, 0, 1, {}, [], '', ' ', 'oooc', 'oocc', 'ooc   ', 'OOC', 'oocnarrator'].forEach(badType => {
      it(`rejects message with bad type: '${badType}'`, (done) => {
         request.post({ uri: `${api}/rps/${rpCode}/chara.json`, json: true, body: { type: badType, content: 'Hello' } }, (err, res, body) => {
            expect(err).toBeFalsy();
            expect(res.statusCode).toBe(400);
            done();
         });
      });
   });
   
   [undefined, null, false, true, {}, [], '0', -1, 1, 0.5, -0.5].forEach(badCharaId => {
      it(`rejects message with bad type: '${badCharaId}'`, (done) => {
         request.post({ uri: `${api}/rps/${rpCode}/chara.json`, json: true, body: { type: 'chara', charaId: badCharaId, content: 'Hello' } }, (err, res, body) => {
            expect(err).toBeFalsy();
            expect(res.statusCode).toBe(400);
            done();
         });
      });
   });
   
});
*/

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