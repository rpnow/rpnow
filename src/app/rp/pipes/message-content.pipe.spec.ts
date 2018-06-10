import { inject, TestBed } from '@angular/core/testing';
import { MessageContentPipe } from './message-content.pipe';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';

describe('MessageContentPipe', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BrowserModule]
    });
  });

  const testPipe = (fn: (pipe: MessageContentPipe) => void) => {
    return inject([DomSanitizer], (domSanitizer: DomSanitizer) => {
      const pipe = new MessageContentPipe(domSanitizer);
      fn(pipe);
    });
  };

  it('create an instance', testPipe(pipe => {
    expect(pipe).toBeTruthy();
  }));

});
