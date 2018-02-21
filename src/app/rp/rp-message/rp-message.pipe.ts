import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { BlackOrWhitePipe } from '../black-or-white.pipe';

@Pipe({
  name: 'msgFormat'
})
export class RpMessagePipe implements PipeTransform {

  private readonly bwPipe = new BlackOrWhitePipe();

  constructor(
    private sanitizer: DomSanitizer
  ) {}

  transform(str: string, color: string = null): any {
    // escape characters
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    str = str.replace(/[&<>"']/g, char => escapeMap[char]);
    // urls
    // http://stackoverflow.com/a/3890175
    str = str.replace(
        /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim,
        '<a href="$1" class="link" target="_blank">$1</a>'
    );
    // actions
    if(color) {
        let contrast = this.bwPipe.transform(color);
        str = str.replace(/\*([^\r\n\*_]+)\*/g, `<span style="background-color: ${color}; color: ${contrast}; padding: 0.1em 0.3em; border-radius: 8px; opacity: 0.9; border: 1px solid rgba(0,0,0,0.2); box-shadow: 2px 2px 4px rgba(0,0,0,0.03);">*$1*</span>`);
    }
    // bold
    str = str.replace(/(^|\s|(?:&quot;))__([^\r\n_]+)__([\s,\.\?!]|(?:&quot;)|$)/g, '$1<b>$2</b>$3');
    // italix
    str = str.replace(/(^|\s|(?:&quot;))_([^\r\n_]+)_([\s,\.\?!]|(?:&quot;)|$)/g, '$1<i>$2</i>$3');
    str = str.replace(/(^|\s|(?:&quot;))\/([^\r\n\/>]+)\/([\s,\.\?!]|(?:&quot;)|$)/g, '$1<i>$2</i>$3');
    // both!
    str = str.replace(/(^|\s|(?:&quot;))___([^\r\n_]+)___([\s,\.\?!]|(?:&quot;)|$)/g, '$1<b><i>$2</i></b>$3');
    // strikethrough
    str = str.replace(/~~([^\r\n<>]+?)~~/g, '<del>$1</del>');
    // line breaks
    // http://stackoverflow.com/questions/2919337/jquery-convert-line-breaks-to-br-nl2br-equivalent
    str = str.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
    // mdash
    str = str.replace(/--/g, '&mdash;');

    // done.
    return this.sanitizer.bypassSecurityTrustHtml(str);
  }

}
