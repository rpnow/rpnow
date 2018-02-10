import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CharaSelectorService } from '../chara-selector.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { RpChara } from '../../../rp.service';
import { OptionsService } from '../../../options.service';

@Component({
  selector: 'rp-message-box',
  templateUrl: 'message-box.html',
  styleUrls: ['message-box.scss']
})
export class MessageBoxComponent implements OnInit {

  constructor(
    private charaSelectorService: CharaSelectorService,
    private options: OptionsService
  ) { }

  public content: '';
  public chara$: BehaviorSubject<string|RpChara>;

  @Output() onMessage: EventEmitter<{content: string, type: string, charaId?: number}> = new EventEmitter();

  ngOnInit() {
    this.chara$ = this.charaSelectorService.currentChara$;
  }

  sendMessage() {
    let chara = this.chara$.value;

    if (chara instanceof RpChara) {
      this.onMessage.emit({ content: this.content, type: 'chara', charaId: chara.id })
    }
    else {
      this.onMessage.emit({ content: this.content, type: chara })
    }

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
}
