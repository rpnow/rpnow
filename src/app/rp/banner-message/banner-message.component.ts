import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { BannerMessageService } from '../services/banner-message.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { OptionsService } from '../services/options.service';

@Component({
  selector: 'banner-message',
  template: `
    <div *ngIf="messageHtml" fxLayout="row" fxLayoutAlign="center center">

      <span class="generated-links-contrast" [innerHTML]="messageHtml"></span>
      
      <button mat-icon-button (click)="onDismiss()">
        <mat-icon>close</mat-icon>
      </button>

    </div>
  `,
  styles: [`
    /* TODO figure out how to import this in an inline styles declaration */
    /* @import '~@angular/material/theming'; */

    div {
      text-align: center;
      padding: 5px;

      color: white;
      background-color: #7c4dff; /* mat-color($mat-deep-purple, "A200"); */
    }
    :host-context(.dark-theme) div {
      color: black;
      background-color: #ffab40; /* mat-color($mat-orange, "A200"); */
    }
  `],
  providers: [BannerMessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BannerMessageComponent implements OnInit {

  private message: string;
  public messageHtml: SafeHtml;

  constructor(
    private service: BannerMessageService,
    private options: OptionsService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.service.message$.subscribe(msg => {
      if (msg) {
        if (msg === this.options.lastBannerSeen) return;

        this.message = msg;
        this.messageHtml = this.sanitizer.bypassSecurityTrustHtml(msg);
      }
      else {
        this.message = '';
        this.messageHtml = '';
        this.options.lastBannerSeen = null;
      }
    })
  }

  onDismiss() {
    this.options.lastBannerSeen = this.message;

    this.message = '';
    this.messageHtml = '';
  }

}
