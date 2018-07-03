import { Injectable, Inject, OnDestroy } from '@angular/core';
import { OptionsService } from './options.service';
import { RpService } from './rp.service';
import { DOCUMENT } from '@angular/common';
import { Observable, Subscription, interval, fromEvent, merge } from 'rxjs';
import { filter, tap, switchMap, map, takeUntil } from 'rxjs/operators';

const audioDir = '/client-files/assets/sounds/';

export const noises = [
  {'name': 'Off', 'audio': null},
  {'name': 'Typewriter', 'audio': new Audio(audioDir + 'typewriter.mp3')},
  {'name': 'Page turn', 'audio': new Audio(audioDir + 'pageturn.mp3')},
  {'name': 'Chimes', 'audio': new Audio(audioDir + 'chimes.mp3')},
  {'name': 'Woosh', 'audio': new Audio(audioDir + 'woosh.mp3')},
  {'name': 'Frog block', 'audio': new Audio(audioDir + 'frogblock.mp3')},
  {'name': 'Classic alert', 'audio': new Audio(audioDir + 'alert.mp3')},
];

@Injectable()
export class NotifyService implements OnDestroy {

  public subscription: Subscription;

  constructor(
    private rp: RpService,
    private options: OptionsService,
    @Inject(DOCUMENT) document: Document,
  ) {

    let oldTitle; // set upon first alert

    const alerts$ = this.rp.newMessages$.pipe(
      filter(() => document.visibilityState !== 'visible')
    );

    const noises$ = alerts$.pipe(
      tap(() => {
        const audio = noises[options.notificationNoise].audio;
        if (audio) audio.play();
      })
    );

    const titleChanges$ = alerts$.pipe(
      tap(() => oldTitle = oldTitle || document.title),
      switchMap(msg => interval(500).pipe(
        map(i => {
          if (i % 2 === 1) return document.title = oldTitle;

          if (msg.type === 'narrator') return '* The narrator says...';
          if (msg.type === 'ooc') return '* OOC message...';
          if (msg.type === 'image') return '* Image posted...';
          if (msg.type === 'chara') return `* ${this.rp.charasById.get(msg.charaId).name} says...`;
          return '* New message...';
        }),
        tap(title => document.title = title),
        takeUntil(
          fromEvent(document, 'visibilitychange').pipe(
            tap(() => document.title = oldTitle)
          )
        )
      ))
    );

    this.subscription = merge(noises$, titleChanges$).subscribe();

  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

}