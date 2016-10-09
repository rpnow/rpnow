/* global describe it expect */
const request = require('request');
const rpnow = require('../server/server');

const host = `http://${process.env.IP}:${process.env.PORT}`;

describe("web server can be started", () => {
   it("is not already running", (done) => {
      request(`${host}/`, (err, res, body) => {
         expect(err).toBeTruthy();
         done();
      });
   });
   
   it("can be started", (done) => {
      rpnow.start('quiet', () => {
         request(`${host}/`, (err, res, body) => {
            expect(err).toBeFalsy();
            expect(res).toBeDefined();
            expect(res.statusCode).toBe(200);
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
      rpnow.start('quiet', () => {
         request(`${host}/`, (err, res, body) => {
            expect(err).toBeFalsy();
            expect(res).toBeDefined();
            expect(res.statusCode).toBe(200);
            done();
         });
      });
   });
});

describe("v1 API", () => {
   var rpCode = null;
   var api = `${host}/api/v1`;
   
   xit("will give a 400 for an invalid api call", (done) => {
      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach(method => {
         [`${api}/`, `${api}`, `${api}/badcall`, `${api}/badcall/1`].forEach(url => {
            expect( request(method, url).statusCode ).toBe(400);
         });
      });
   });
   
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
   
   xit("will give a blank page for page 1");
   xit("will give a 404 for page 2");
   xit("will give a 204 no content when checking for updates");
   xit("will give an error when checking for updates that don't exist yet");
   
   xit("accepts new chara and gives an id");
   xit("rejects chara with bad name");
   xit("rejects chara with bad color");
   
   xit("accepts narrator message");
   xit("accepts ooc message");
   xit("accept chara message");
   xit("rejects message with no content");
   xit("rejects message with bad type");
   xit("rejects chara-message with bad charaId");
   
   xit("gives 200 when there are chat updates");
   
   xit("outputs a text document of the RP");
});
