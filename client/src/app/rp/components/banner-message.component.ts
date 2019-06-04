import { Component, ChangeDetectionStrategy, Input, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'rpn-banner-message',
  template: `
    <div *ngIf="showShutdown" id="shutdown">

      <span class="generated-links-contrast">
        <strong>Rpnow.net will permanently shut down on July 31.</strong> <br/><a class="link" target="_blank" href="https://blog.rpnow.net/post/185370236376/rpnownet-will-permanently-shut-down-on-july-31">More info here.</a>
      </span>

      <button mat-icon-button (click)="showShutdown = false">
        <mat-icon>close</mat-icon>
      </button>

    </div>
  `,
  // template: `
  //   <div *ngIf="showTos" id="tos">

  //     <span class="generated-links-contrast">
  //       By using RPNow, you agree to its <a class="link" target="_blank" href="/terms">terms of use.</a>
  //     </span>

  //     <button mat-icon-button (click)="acceptTerms.emit()">
  //       <mat-icon>close</mat-icon>
  //     </button>

  //   </div>
  //   <div *ngIf="hasUpdate" id="update">

  //     <span class="generated-links-contrast">
  //       An update is available! <a href="javascript:;" (click)="activateUpdate.emit()">Update now</a> to use the latest features.
  //     </span>

  //     <button mat-icon-button (click)="hasUpdate = false">
  //       <mat-icon>close</mat-icon>
  //     </button>

  //   </div>
  // `,
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
    }
    div#tos {
      color: white;
      background-color: #7c4dff; /* mat-color($mat-deep-purple, "A200"); */
    }
    :host-context(.dark-theme) div#tos {
      color: black;
      background-color: #ffab40; /* mat-color($mat-orange, "A200"); */
    }
    div#update {
      color: white;
      background-color: #1E88E5;
    }
    :host-context(.dark-theme) div#update {
      color: black;
      background-color: #2196F3;
    }
    div#shutdown {
      color: white;
      background-color: #C62828;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BannerMessageComponent {

  showShutdown = true;

  @Input() showTos: boolean;
  @Input() hasUpdate: boolean;

  @Output() readonly acceptTerms: EventEmitter<string> = new EventEmitter();
  @Output() readonly activateUpdate: EventEmitter<string> = new EventEmitter();

}
