import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CharaSelectorService } from '../chara-selector.service';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { RpVoice, RpService } from '../../rp.service';
import { OptionsService } from '../../options.service';
import { MatDialog } from '@angular/material/dialog';
import { FormatGuideDialog } from '../../info-dialogs/format-guide-dialog/format-guide-dialog.component';

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
    private options: OptionsService
  ) { }

  public content: '';
  public chara$: BehaviorSubject<RpVoice>;
  public class$: Observable<string>;

  ngOnInit() {
    this.chara$ = this.charaSelectorService.currentChara$;
    this.class$ = this.chara$.map(chara => {
      return (typeof chara === 'string') ? 'message-box-'+chara : 'message-box-chara';
    })
  }

  sendMessage() {
    let chara = this.chara$.value;
    let msg = (typeof chara === 'string') ?
      { content: this.content, type: chara } :
      { content: this.content, type: 'chara', charaId: chara.id };

    this.rp.addMessage(msg);

    this.content = '';
  }

  openCharaSelector() {
    this.charaSelectorService.menu.open();
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
