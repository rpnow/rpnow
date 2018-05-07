import { Component, Output, EventEmitter, ViewContainerRef, ChangeDetectionStrategy, Input } from '@angular/core';
import { CharaSelectorService } from '../chara-selector.service';
import { RpVoice, RpService } from '../../rp.service';
import { MatDialog } from '@angular/material/dialog';
import { FormatGuideDialog } from '../../info-dialogs/format-guide-dialog/format-guide-dialog.component';
import { ImageDialogComponent } from '../image-dialog/image-dialog.component';

@Component({
  selector: 'rp-message-box',
  templateUrl: 'message-box.html',
  styleUrls: ['message-box.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageBoxComponent {

  @Input() chara: RpVoice;
  @Input() content: string = '';
  @Input() pressEnterToSend: boolean;
  @Output() contentChange: EventEmitter<string> = new EventEmitter();
  @Output() onSendMessage: EventEmitter<[string, RpVoice]> = new EventEmitter();
  @Output() changeCharacter: EventEmitter<void> = new EventEmitter();

  constructor(
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef,
  ) { }

  get class() {
    return (typeof this.chara === 'string') ? 'message-box-'+this.chara : 'message-box-chara';
  }

  valid() {
    return this.content.trim().length > 0;
  }

  sendMessage() {
    if (!this.valid()) return;

    let voice = this.chara;
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
