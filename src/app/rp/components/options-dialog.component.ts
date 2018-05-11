import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { OptionsService } from '../services/options.service';
import { noises } from '../services/notify.service';

@Component({
  selector: 'app-options-dialog',
  template: `
    <div fxLayout="row" fxLayoutAlign="center center">

        <h3 mat-dialog-title fxFlex>Preferences</h3>

        <button mat-icon-button mat-dialog-title mat-dialog-close>
            <mat-icon aria-label="Close dialog" matTooltip="Close">close</mat-icon>
        </button>

    </div>

    <mat-dialog-content>

        <mat-list>

            <h3 matSubheader>Display</h3>

            <mat-list-item title="Display the site in a darker color scheme">
                <mat-icon mat-list-icon>brightness_4</mat-icon>
                <p mat-line>Night mode</p>
                <mat-checkbox [(ngModel)]="options.nightMode"></mat-checkbox>
            </mat-list-item>

            <mat-divider></mat-divider>

            <h3 matSubheader>Notifications</h3>

            <mat-list-item title="Change the notification noise which will play when the tab is hidden, or just turn it off.">
                <mat-icon mat-list-icon>notifications</mat-icon>
                <p mat-line>
                    <mat-select [(ngModel)]="options.notificationNoise">
                        <mat-option *ngFor="let noise of noteNoiseOptions; let i = index" [value]="i" (click)="noise.audio?.play()">
                            {{noise.name}}
                        </mat-option>
                    </mat-select>
                </p>
            </mat-list-item>

            <mat-divider></mat-divider>

            <h3 matSubheader>Messages</h3>

            <mat-list-item title="When turned on, pressing the 'Enter' key will send a message. When turned off, pressing 'Enter' will insert a paragraph break.">
                <mat-icon mat-list-icon>send</mat-icon>
                <p mat-line>Press <kbd>Enter</kbd> to send</p>
                <mat-checkbox [(ngModel)]="options.pressEnterToSend"></mat-checkbox>
            </mat-list-item>

            <mat-list-item title="Show or hide the timestamps and color-ID's on all messages.">
                <mat-icon mat-list-icon>account_box</mat-icon>
                <p mat-line>Show message details</p>
                <mat-checkbox [(ngModel)]="options.showMessageDetails"></mat-checkbox>
            </mat-list-item>

        </mat-list>

    </mat-dialog-content>
  `,
  styles: [`
    mat-select { max-width: 200px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptionsDialogComponent {
  constructor(public options: OptionsService) { }
  public readonly noteNoiseOptions = noises;
}
