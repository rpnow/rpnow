/* global describe it expect */
const request = require('request');
const rpnow = require('../src/server/server');

const host = `http://${process.env.IP}:${process.env.PORT}`;
const api = `${host}/api/v1`;

describe("web server", () => {
   const options = { logging: false, rateLimit: false };
   
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
      rpnow.stop("test stopping server", () => {
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

describe("invalid API calls", () => {
   var methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
   var urls = [`${api}/`, `${api}`, `${api}/badcall`, `${api}/badcall/1`];
   methods.forEach(method => {
      urls.forEach(url => {
         it(`will give a 400 call for a bad api ${method} call to ${url}`, (done) => {
            request({ uri: url, method: method }, (err, res, body) => {
               expect(err).toBeFalsy();
               expect(res.statusCode).toBe(400);
               done();
            });
         });
      });
   });
});

describe("API basic coverage", () => {
   var rpCode = null;
   
   it("will give the rp code when created", (done) => {
      request.post({ uri: `${api}/rps.json`, json: true, body: { title: "Test RP" } }, (err, res, body) => {
         expect(err).toBeFalsy();
         rpCode = body.rpCode;
         expect(res.statusCode).toBe(201);
         expect(rpCode).toMatch(/^[a-zA-Z0-9]{8}$/);
         done();
      });
   });
   
   it("will give the blank rp when requested", (done) => {
      request.get(`${api}/rps/${rpCode}.json`, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(200);
         done();
      });
   });
   
   it("will give a 404 for an invalid RP", (done) => {
      var badRpCode = 'noRPhere';
      request.get(`${api}/rps/${badRpCode}.json`, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(404);
         done();
      });
   });
   
   it("will give a blank page for page 1", (done) => {
      request.get(`${api}/rps/${rpCode}/page/1.json`, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(200);
         done();
      });
   });
   it("will give a 404 for page 2", (done) => {
      request.get(`${api}/rps/${rpCode}/page/2.json`, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(404);
         done();
      });
   });
   it("will give a 204 no content when checking for updates", (done) => {
      request.get(`${api}/rps/${rpCode}/updates.json?updateCounter=0`, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(204);
         done();
      });
   });
   it("will give an error when checking for updates that don't exist yet", (done) => {
      request.get(`${api}/rps/${rpCode}/updates.json?updateCounter=1`, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(400);
         done();
      });
   });
   
   it("accepts new chara and gives an id", (done) => {
      request.post({ uri: `${api}/rps/${rpCode}/chara.json`, json: true, body: { name: 'Cassie', color: '#ca551e' } }, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(201);
         expect(body.id).toBe(0);
         done();
      });
   });
   
   
   it("accepts narrator message", (done) => {
      request.post({ uri: `${api}/rps/${rpCode}/msg.json`, json: true, body: { type: 'narrator', content: 'Narrator message text.' } }, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(201);
         expect(body.id).toBe(0);
         done();
      });
   });
   
   it("accepts ooc message", (done) => {
      request.post({ uri: `${api}/rps/${rpCode}/msg.json`, json: true, body: { type: 'ooc', content: 'OOC message text.' } }, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(201);
         expect(body.id).toBe(1);
         done();
      });
   });
   
   it("accepts chara message", (done) => {
      request.post({ uri: `${api}/rps/${rpCode}/msg.json`, json: true, body: { type: 'chara', charaId: 0, content: 'OOC message text.' } }, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(201);
         expect(body.id).toBe(2);
         done();
      });
   });
   
   [0, 1, 2, 3].forEach(updateCounter => {
      it(`gives 200 when there are chat updates (update counter = ${updateCounter})`, (done) => {
         request.get(`${api}/rps/${rpCode}/updates.json?updateCounter=${updateCounter}`, (err, res, body) => {
            expect(err).toBeFalsy();
            expect(res.statusCode).toBe(200);
            done();
         });
      });
   });
   
   it("gives 204 after reaching the end of chat updates", (done) => {
      request.get(`${api}/rps/${rpCode}/updates.json?updateCounter=4`, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(204);
         done();
      });
   });
   
   it("outputs a text document of the RP", (done) => {
      request.get(`${api}/rps/${rpCode}.txt`, (err, res, body) => {
         expect(err).toBeFalsy();
         expect(res.statusCode).toBe(200);
         done();
      });
   });
});

describe("POST constraints within an RP", () => {
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

describe("web server (after running all tests)", () => {
   it("can be stopped", (done) => {
      rpnow.stop("test stopping server", () => {
         request(`${host}/`, (err, res, body) => {
            expect(err).toBeTruthy();
            done();
         });
      });
   });
});