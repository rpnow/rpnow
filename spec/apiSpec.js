/* global describe it expect */
const request = require('sync-request');

const host = `http://${process.env.IP}:${process.env.PORT}`;

describe("web server is running", () => {
   it("is running", () => {
      var req = request('GET', `${host}/`);
      expect(req.statusCode).toBe(200);
   });
});

describe("v1 API", () => {
   var rpCode = null;
   var api = `${host}/api/v1`;
   
   it("will give a 400 for an invalid api call", () => {
      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach(method => {
         [`${api}/`, `${api}`, `${api}/badcall`, `${api}/badcall/1`].forEach(url => {
            expect( request(method, url).statusCode ).toBe(400);
         });
      });
   });
   
   it("will give the rp code when created", () => {
      var req = request('POST', `${api}/rps.json`, { json: { title: "Test RP" } });
      rpCode = JSON.parse(req.body).rpCode;
      expect(req.statusCode).toBe(201);
      expect(rpCode).toMatch(/^[a-zA-Z0-9]{8}$/);
   });
   
   it("will give the blank rp when requested", () => {
      var req = request('GET', `${api}/rps/${rpCode}.json`);
      expect(req.statusCode).toBe(200);
   });
   
   it("will give a 404 for an invalid RP", () => {
      var badRpCode = 'noRPhere';
      var req = request('GET', `${api}/rps/${badRpCode}.json`);
      expect(req.statusCode).toBe(404);
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
