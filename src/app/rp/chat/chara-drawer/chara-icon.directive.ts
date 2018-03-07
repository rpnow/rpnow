import { Directive, ElementRef, Input } from '@angular/core';
import { BlackOrWhitePipe } from '../../black-or-white.pipe';

const regex = /^#[0-9a-f]{6}$/i.compile();

@Directive({
  selector: '[charaIconColor]'
})
export class CharaIconDirective {

  private bw = new BlackOrWhitePipe();

  constructor(private el: ElementRef) { }

  @Input('charaIconColor') set _color(color: string) {
    if (!regex.test(color)) return;
    let style = (<HTMLElement>this.el.nativeElement).style;
    style.color = color;
    style.textShadow = '1px 1px 0 '+this.bw.transform(color, 0.3, true);
  }

}
