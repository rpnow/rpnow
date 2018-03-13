import { Component, OnInit } from '@angular/core';
import { BannerMessageService } from './banner-message.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'banner-message',
  template: `
    <div *ngIf="message" fxLayout="row" fxLayoutAlign="center center">

      <span class="generated-links-contrast" [innerHTML]="message"></span>
      
      <button mat-icon-button (click)="message=''">
        <mat-icon>close</mat-icon>
      </button>

    </div>
  `,
  styleUrls: ['banner-message.scss'],
  providers: [BannerMessageService]
})
export class BannerMessageComponent implements OnInit {

  public message: SafeHtml;

  constructor(
    private service: BannerMessageService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.service.message$.subscribe(msg => this.message = this.sanitizer.bypassSecurityTrustHtml(msg))
  }

}
