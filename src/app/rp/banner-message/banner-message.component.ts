import { Component, OnInit } from '@angular/core';
import { BannerMessageService } from './banner-message.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { OptionsService } from '../options.service';

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
  styleUrls: ['banner-message.scss'],
  providers: [BannerMessageService]
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
