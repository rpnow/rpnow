import { Component, ChangeDetectionStrategy, Input, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'rpn-banner-message',
  template: `
    <div *ngIf="showTos">

      <span class="generated-links-contrast">
        By using RPNow, you agree to its <a class="link" target="_blank" href="/terms">terms of use.</a>
      </span>

      <button mat-icon-button (click)="onDismiss()">
        <mat-icon>close</mat-icon>
      </button>

    </div>
  `,
  styles: [`
    /* TODO figure out how to import this in an inline styles declaration */
    /* @import '~@angular/material/theming'; */

    div {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;

      padding: 5px;

      text-align: center;
      color: white;
      background-color: #7c4dff; /* mat-color($mat-deep-purple, "A200"); */
    }
    :host-context(.dark-theme) div {
      color: black;
      background-color: #ffab40; /* mat-color($mat-orange, "A200"); */
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BannerMessageComponent {

  @Input() showTos: boolean;

  @Output() readonly dismiss: EventEmitter<string> = new EventEmitter();

  onDismiss() {
    this.dismiss.emit();
  }

}
