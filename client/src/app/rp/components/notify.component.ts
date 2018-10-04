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

    // desktop notifications
    // TODO remove any-typing of Notification when upgrading to typescript 3
    if ('Notification' in window && (Notification as any).permission === 'granted') {
      try {
        new Notification(this.getNotificationTextFor(msg), {
          body: msg.content || undefined,
          icon: msg.url || undefined,
          tag: msg._id,
        });
      }
      catch (ex) {
        // Chrome on Android (at least Android 4-7) throws an error
        // "Failed to construct 'Notification': Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead."
        // No action needed
      }
    }

    // attempt to play noise
    const audio = noises[this.options.notificationNoise].audio;
    if (audio) {
      const audioPromise = audio.play();
      if (audioPromise !== undefined) audioPromise.catch(error => {
        // TODO handle audio play failure
      })
    }

    // page title
    if (!this.oldTitle) this.oldTitle = this.document.title;
    this.document.title = this.getTitleTextFor(msg);
  }

  @Input() charasById: Map<RpCharaId, RpChara>;
  @Input('title') rpTitle: string;

  ngOnInit() {
    if ('Notification' in window) {
      // TODO remove any-typing of Notification when upgrading to typescript 3
      if ((Notification as any).permission !== 'granted') {
        Notification.requestPermission();
      }
    }
    document.addEventListener('visibilitychange', () => {
      if (this.oldTitle) this.document.title = this.oldTitle;
    });
  }

  getTitleTextFor(msg: RpMessage) {
    if (msg.type === 'narrator') return '* The narrator says...';
    if (msg.type === 'ooc') return '* OOC message...';
    if (msg.type === 'image') return '* Image posted...';
    if (msg.type === 'chara') return `* ${this.charasById.get(msg.charaId).name} says...`;
    return '* New message...';
  }

  getNotificationTextFor(msg: RpMessage) {
    if (msg.type === 'narrator') return `[${this.rpTitle}] The narrator says...`;
    if (msg.type === 'ooc') return `[${this.rpTitle}] OOC message...`;
    if (msg.type === 'image') return `[${this.rpTitle}] An image was posted!`;
    if (msg.type === 'chara') return `[${this.rpTitle}] ${this.charasById.get(msg.charaId).name} says...`;
    return `[${this.rpTitle}] New message!`;
  }

}
