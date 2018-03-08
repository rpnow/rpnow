import { Injectable, Inject, OnDestroy } from '@angular/core';
import { OptionsService } from './options.service';
import { RpService } from './rp.service';
import { DOCUMENT } from '@angular/platform-browser';
import { Observable } from 'rxjs/Observable';
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
export class NotifyService {

  public subscription: Subscription;

  constructor(
    private rp: RpService,
    private options: OptionsService,
    @Inject(DOCUMENT) document: Document,
  ) {

    let oldTitle = document.title;

    let alerts$ = this.rp.newMessages$
      .filter(() => document.visibilityState !== 'visible')
    
    let noises$ = alerts$.do(() => {
      let audio = noises[options.notificationNoise].audio;
      if (audio) audio.play();
    })

    let titleChanges$ = alerts$
      .switchMap(msg => Observable.interval(500)
        .map(i => {
          if (i % 2 === 1) return document.title = oldTitle

          if (msg.type === 'narrator') return '* The narrator says...'
          if (msg.type === 'ooc') return '* OOC message...'
          if (msg.type === 'image') return '* Image posted...'
          if (msg.type === 'chara') return `* ${this.rp.charasById[msg.charaId].name} says...`
          return '* New message...';
        })
        .do(title => document.title = title)
        .takeUntil(Observable.fromEvent(document, 'visibilitychange').do(() => document.title = oldTitle))
      )

    this.subscription = Observable.merge(
      noises$,
      titleChanges$
    ).subscribe();

  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

}
