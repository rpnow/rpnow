import { Component, ChangeDetectionStrategy, Input, HostBinding } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { OnInit } from '@angular/core/src/metadata/lifecycle_hooks';

@Component({
  selector: 'rpn-nag',
  template: '',
  styles: [`
    :host {
      display: block;
      margin: 20px auto 0;
      padding: 15px;
      box-sizing: border-box;
      width: 100%;
      max-width: 600px;
      text-align: center;
      word-wrap: break-word;
      opacity: 0.6;
      font-style: italic;
      font-size: 90%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NagComponent implements OnInit {

  @HostBinding('innerHTML') html: SafeHtml;
  @HostBinding('class') _class = 'generated-links';

  readonly donors: {name: string, dollars: number}[] = [
    { name: 'Miha and Hika', dollars: 10 },
    { name: 'Tan', dollars: 5 },
    { name: 'Kosnkarnate', dollars: 5 },
    { name: 'Mika', dollars: 5 },
    { name: 'Dianna Lennox', dollars: 5 },
    { name: 'Charlie and Elliott', dollars: 5 }
  ];

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    const { name, dollars } = this.donors[Math.floor(Math.random() * this.donors.length)];
    this.html = this.sanitizer.bypassSecurityTrustHtml(
      `Thank you <strong>${name}</strong> for donating $${dollars} monthly <a href="https://www.patreon.com/rpnow">on Patreon!</a>`
    );
  }

}
