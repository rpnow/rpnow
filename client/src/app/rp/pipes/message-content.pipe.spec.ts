import { inject, TestBed } from '@angular/core/testing';
import { MessageContentPipe } from './message-content.pipe';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';

const tests: { [testName: string]: [string, string|null, string][] } = {

  'regular strings': [
    ['Hello world!', null, 'Hello world!'],
    ['', null, ''],
  ],

  'escape': [
    ['<b>Escape this</b>', null, '&lt;b&gt;Escape this&lt;/b&gt;'],
  ],

  '/italics/': [
    ['/Test/', null, '<i>Test</i>'],
    ['Time to /Test/ this', null, 'Time to <i>Test</i> this'],
  ],

  '_italics_': [
    ['_Test_', null, '<i>Test</i>'],
    ['Time to _Test_ this', null, 'Time to <i>Test</i> this'],
  ],

  '__bold__': [
    ['__Test__', null, '<b>Test</b>'],
    ['Time to __Test__ this', null, 'Time to <b>Test</b> this'],
  ],

  'newlines': [
    ['Two\nlines', null, 'Two<br>lines'],
  ],

};

describe('MessageContentPipe', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BrowserModule]
    });
  });

  for (const [itText, pairs] of Object.entries(tests)) {
    it(itText, inject([DomSanitizer], (domSanitizer: DomSanitizer) => {
      const pipe = new MessageContentPipe(domSanitizer);
      for (const [input, color, expected] of pairs) {
        const html = pipe.transform(input, color);
        expect(domSanitizer.sanitize(SecurityContext.HTML, html)).toEqual(domSanitizer.sanitize(SecurityContext.HTML, expected));
      }
    }));
  }

});
