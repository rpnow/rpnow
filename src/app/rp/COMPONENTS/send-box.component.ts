import { Component, Output, EventEmitter, ViewContainerRef, ChangeDetectionStrategy, Input } from '@angular/core';
import { RpVoice, RpService, RpChara } from '../rp.service';
import { MatDialog } from '@angular/material/dialog';
import { FormatGuideDialog } from './format-guide-dialog.component';
import { ImageDialogComponent } from '../chat/image-dialog/image-dialog.component';

@Component({
  selector: 'send-box',
  template: `
    <div id="send-box" fxLayout="column" [class]="elementClass" [style.background-color]="chara?.color" [style.color]="chara?.color|bw">

        <div id="voice-bar" fxLayout="row" fxLayoutAlign="center center">

            <div id="click-to-change" fxFlex fxLayout="row" fxLayoutAlign="start center" fxLayoutGap="10px" matTooltip="Change character" matTooltipPosition="above" (click)="openCharaSelector()">
                <ng-container *ngIf="isNarrator">
                    Narrator
                </ng-container>

                <ng-container *ngIf="isOOC">
                    Out of character
                </ng-container>

                <ng-container *ngIf="isChara">
                    {{chara.name}}
                </ng-container>
            </div>

            <button mat-icon-button (click)="openCharaSelector()">
                <mat-icon aria-label="Change character" matTooltip="Change character" matTooltipPosition="above">people</mat-icon>
            </button>

            <button mat-icon-button (click)="showImageDialog()">
                <mat-icon aria-label="Post image" matTooltip="Post image" matTooltipPosition="above">image</mat-icon>
            </button>

            <button mat-icon-button (click)="showFormatGuideDialog()">
                <mat-icon aria-label="Open post format guide" matTooltip="Formatting info" matTooltipPosition="above">text_fields</mat-icon>
            </button>

        </div>

        <div id="typing-area" fxLayout="row" fxLayoutAlign="center center">

            <textarea fxFlex matTextareaAutosize matAutosizeMinRows="3" [(ngModel)]="content" (ngModelChange)="contentChange.emit($event)" placeholder="Type your message." maxlength="10000" (keypress)="keypressCheckEnter($event)"></textarea>

            <button mat-icon-button [disabled]="!valid()" (click)="sendMessage()">
                <mat-icon aria-label="Send" matTooltip="Send" matTooltipPosition="above">send</mat-icon>
            </button>

        </div>

    </div>
  `,
  styleUrls: ['./send-box.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SendBoxComponent {

  @Input() voice: RpVoice;
  @Input() content: string = '';
  @Input() pressEnterToSend: boolean;
  @Output() contentChange: EventEmitter<string> = new EventEmitter();
  @Output() onSendMessage: EventEmitter<[string, RpVoice]> = new EventEmitter();
  @Output() changeCharacter: EventEmitter<void> = new EventEmitter();

  constructor(
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef,
  ) { }

  get isNarrator() {
    return this.voice === 'narrator';
  }

  get isOOC() {
    return this.voice === 'ooc';
  }

  get isChara() {
    return !(typeof this.voice === 'string');
  }

  get chara() {
    return this.isChara ? (this.voice as RpChara) : null;
  }

  get elementClass() {
    return this.isChara ? 'send-box-chara' : 'send-box-'+this.voice;
  }

  valid() {
    return this.content.trim().length > 0;
  }

  sendMessage() {
    if (!this.valid()) return;

    let voice = this.voice;
    let content = this.content;

    // shortcut to send ooc messages; if not on the actual OOC character,
    //  you can send a message inside of (()) et all, as a shortcut to change
    //  that specific message to an OOC message
    if (voice !== 'ooc') {
      [
        /^\({2,}\s*(.*?[^\s])\s*\)*$/g, // (( message text ))
        /^\{+\s*(.*?[^\s])\s*\}*$/g, // { message text }, {{ message text }}, ...
        /^\/\/\s*(.*[^\s])\s*$/g // //message text
      ].find(regex => {
        let match = regex.exec(content);
        if (match) {
          voice = 'ooc'
          content = match[1]
        }
        return !!match;
      })
    }

    if (!content.trim()) return;

    this.onSendMessage.emit([content, voice]);

    this.content = '';
  }

  openCharaSelector() {
    this.changeCharacter.emit()
  }

  showImageDialog() {
    let dialogRef = this.dialog.open(ImageDialogComponent, { viewContainerRef: this.viewContainerRef });
  }

  keypressCheckEnter($event: KeyboardEvent) {
    let keyCode = $event.keyCode || $event.which;
    if (keyCode !== 13) return;

    if ($event.shiftKey) return;

    if (this.pressEnterToSend || $event.ctrlKey) {
      this.sendMessage();
      return false;
    }
  }

  showFormatGuideDialog() {
    this.dialog.open(FormatGuideDialog);
  }
}
