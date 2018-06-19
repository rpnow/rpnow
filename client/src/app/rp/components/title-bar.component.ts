import { Component, Input, ChangeDetectionStrategy, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'rpn-title-bar',
  template: `
    <mat-toolbar class="shadow-toolbar">

      <mat-toolbar-row>

        <span id="buttons">
          <button mat-icon-button (click)="openMenu()">
            <mat-icon aria-label="Main menu" matTooltip="Main menu">menu</mat-icon>
          </button>
        </span>

        <h1 id="title">
          {{ title }}
        </h1>

        <span id="buttons-right">
          <button mat-icon-button (click)="toggleDesc()" *ngIf="hasDesc">
            <mat-icon aria-label="Show description" matTooltip="Show description">{{ descIcon }}</mat-icon>
          </button>
        </span>

      </mat-toolbar-row>

      <mat-toolbar-row id="desc-row" *ngIf="isDescOpen">
        <p>{{ desc }}</p>
      </mat-toolbar-row>

    </mat-toolbar>
  `,
  styles: [`
    #buttons {
      flex: 1 0 40px; /* 40px is the size of the icon inside */
    }
    #title {
      flex: 0 1 auto;
      text-align: center;
      overflow-x: hidden;
      text-overflow: ellipsis;
    }
    #buttons-right {
      flex: 1 999 40px;
    }
    #desc-row {
      font-size: 14px;
      height: auto;
      white-space: initial;
      line-height: 1.6;
      text-align: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TitleBarComponent {

  @Input() title: string;
  @Input() desc: string;

  isDescOpen = false;

  @Output() readonly clickMenu: EventEmitter<void> = new EventEmitter();

  openMenu() {
    this.clickMenu.emit();
  }

  get hasDesc(): boolean {
    return !!this.desc;
  }

  get descIcon(): string {
    return this.isDescOpen ? 'expand_less' : 'expand_more';
  }

  toggleDesc() {
    this.isDescOpen = !this.isDescOpen;
  }

}
