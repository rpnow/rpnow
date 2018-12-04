import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { transformRpMessage } from '../models/parser';

@Pipe({
  name: 'msgFormat'
})
export class MessageContentPipe implements PipeTransform {

  constructor(
    private sanitizer: DomSanitizer
  ) {}

  transform(str: string, color: string = null): SafeHtml {
    const html = transformRpMessage(str, color);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

}
