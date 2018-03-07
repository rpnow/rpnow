import { Injectable, Inject, OnDestroy } from '@angular/core';
import { OptionsService } from './options.service';
import { RpService } from './rp.service';
import { DOCUMENT } from '@angular/platform-browser';
import { Subscription } from 'rxjs/Subscription';

const audioDir = '/assets/sounds/';

export const noises = [
  {'name':'Off', 'audio':null},
  {'name':'Typewriter', 'audio': new Audio(audioDir+'typewriter.mp3')},
  {'name':'Page turn', 'audio': new Audio(audioDir+'pageturn.mp3')},
  {'name':'Chimes', 'audio': new Audio(audioDir+'chimes.mp3')},
  {'name':'Woosh', 'audio': new Audio(audioDir+'woosh.mp3')},
  {'name':'Frog block', 'audio': new Audio(audioDir+'frogblock.mp3')},
  {'name':'Classic alert', 'audio': new Audio(audioDir+'alert.mp3')},
]

@Injectable()
export class NotifyService implements OnDestroy {

  private subscription: Subscription;

  constructor(
    private rp: RpService,
    private options: OptionsService,
    @Inject(DOCUMENT) document: Document,
  ) {

    this.subscription = this.rp.newMessages$.subscribe(msg => {
      if (document.visibilityState === 'visible') return;

      let audio = noises[options.notificationNoise].audio;
      if (audio) audio.play();
    })

  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

}
