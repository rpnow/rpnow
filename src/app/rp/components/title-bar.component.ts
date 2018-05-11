import { Component, Input, ChangeDetectionStrategy, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'title-bar',
  template: `
    <mat-toolbar class="shadow-toolbar">

      <span fxFlex fxLayoutAlign="start center">
        <button mat-icon-button (click)="openMenu()">
          <mat-icon aria-label="Main menu" matTooltip="Main menu">menu</mat-icon>
        </button>
      </span>

      <h1 [matTooltip]="tooltip" fxFlex fxLayoutAlign="center center">
        {{ title }}
      </h1>

      <span fxFlex></span>

    </mat-toolbar>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TitleBarComponent {

  @Input() title: string
  @Input() tooltip: string

  @Output() clickMenu: EventEmitter<void> = new EventEmitter()

  openMenu() {
    this.clickMenu.emit()
  }

}
