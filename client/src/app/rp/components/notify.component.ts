import { Component, OnInit, ChangeDetectionStrategy, Input, Inject } from '@angular/core';
import { noises } from '../models/noises';
import { OptionsService } from '../services/options.service';
import { RpMessage } from '../models/rp-message';
import { DOCUMENT } from '@angular/common';
import { RpChara, RpCharaId } from '../models/rp-chara';

@Component({
  selector: 'rpn-notify',
  template: '',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotifyComponent implements OnInit {

  constructor(
    private options: OptionsService,
    @Inject(DOCUMENT) private document: Document,
  ) { }

  noises = noises;

  oldTitle: string;

  @Input() set lastMessage(msg: RpMessage) {
    if (!msg) return;

    // no alert if screen is visible
    if (this.document.visibilityState === 'visible') return;

    // play noise
    const audio = noises[this.options.notificationNoise].audio;
    if (audio) audio.play();

    // page title
    if (!this.oldTitle) this.oldTitle = this.document.title;
    this.document.title = this.getAlertTextFor(msg);
  }

  @Input() charasById: Map<RpCharaId, RpChara>;

  ngOnInit() {
    document.addEventListener('visibilitychange', () => {
      if (this.oldTitle) this.document.title = this.oldTitle;
    });
  }

  getAlertTextFor(msg: RpMessage) {
    if (msg.type === 'narrator') return '* The narrator says...';
    if (msg.type === 'ooc') return '* OOC message...';
    if (msg.type === 'image') return '* Image posted...';
    if (msg.type === 'chara') return `* ${this.charasById.get(msg.charaId).name} says...`;
    return '* New message...';
  }

}
