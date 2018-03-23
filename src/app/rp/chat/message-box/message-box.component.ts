import { Component, OnInit, Output, EventEmitter, ViewContainerRef } from '@angular/core';
import { CharaSelectorService } from '../chara-selector.service';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { RpVoice, RpService } from '../../rp.service';
import { OptionsService } from '../../options.service';
import { MatDialog } from '@angular/material/dialog';
import { FormatGuideDialog } from '../../info-dialogs/format-guide-dialog/format-guide-dialog.component';
import { ImageDialogComponent } from '../image-dialog/image-dialog.component';
import { map } from 'rxjs/operators/map';

@Component({
  selector: 'rp-message-box',
  templateUrl: 'message-box.html',
  styleUrls: ['message-box.scss']
})
export class MessageBoxComponent implements OnInit {

  constructor(
    public rp: RpService,
    private charaSelectorService: CharaSelectorService,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef,
    private options: OptionsService
  ) { }

  public chara$: BehaviorSubject<RpVoice>;
  public class$: Observable<string>;

  ngOnInit() {
    this.chara$ = this.charaSelectorService.currentChara$;
    this.class$ = this.chara$.pipe(
      map(chara => (typeof chara === 'string') ? 'message-box-'+chara : 'message-box-chara')
    )
  }

  public get content() {
    return this.options.msgBoxContent;
  }
  public set content(value) {
    this.options.msgBoxContent = value;
  }

  valid() {
    return this.content.trim();
  }

  sendMessage() {
    if (!this.valid()) return;

    let chara = this.chara$.value;
    let content = this.content;
    let msg = (typeof chara === 'string') ?
      { content, type: <'narrator'|'ooc'>chara } :
      { content, type: <'chara'>'chara', charaId: chara.id };

    
    // shortcut to send ooc messages; if not on the actual OOC character,
    //  you can send a message inside of (()) et all, as a shortcut to change
    //  that specific message to an OOC message
    if (msg.type !== 'ooc') {
      [
        /^\({2,}\s*(.*?[^\s])\s*\)*$/g, // (( message text ))
        /^\{+\s*(.*?[^\s])\s*\}*$/g, // { message text }, {{ message text }}, ...
        /^\/\/\s*(.*[^\s])\s*$/g // //message text
      ].find(regex => {
        let match = regex.exec(msg.content);
        if (match) msg = { content: match[1], type: 'ooc' };
        return !!match;
      })
    }

    if (!msg.content.trim()) return;

    this.rp.addMessage(msg);

    this.content = '';
  }

  openCharaSelector() {
    this.charaSelectorService.menu.open();
  }

  showImageDialog() {
    let dialogRef = this.dialog.open(ImageDialogComponent, { viewContainerRef: this.viewContainerRef });
  }

  keypressCheckEnter($event: KeyboardEvent) {
    let keyCode = $event.keyCode || $event.which;
    if (keyCode !== 13) return;

    if ($event.shiftKey) return;

    if (this.options.pressEnterToSend || $event.ctrlKey) {
      this.sendMessage();
      return false;
    }
  }

  showFormatGuideDialog() {
    this.dialog.open(FormatGuideDialog);
  }
}
