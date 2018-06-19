import { Injectable, OnDestroy } from '@angular/core';
import { Challenge } from './challenge.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { RpService } from './rp.service';
import { migrateOptions } from './options.migrations';
import { RpVoiceSerialized } from '../models/rp-voice';
import { RpCharaId } from '../models/rp-chara';
import { RpCodeService } from './rp-code.service';

const GLOBAL = 'GLOBAL';
const ROOM = 'ROOM';

@Injectable()
export class OptionsService implements OnDestroy {

  constructor(private rpCodeService: RpCodeService) {}

  private subscriptions: Subscription[] = [];

  private subject<T>(propName: string, global: 'GLOBAL'|'ROOM', defaultValue: T): BehaviorSubject<T> {
    migrateOptions();

    const localStorageKey = global === 'GLOBAL' ?
      `rpnow.global.${propName}` :
      `rpnow.rp.${this.rpCodeService.rpCode}.${propName}`;

    const stringValue = localStorage.getItem(localStorageKey);
    const value = (stringValue != null) ? JSON.parse(stringValue) : defaultValue;

    const subj = new BehaviorSubject(value);

    this.subscriptions.push(subj.subscribe(val => localStorage.setItem(localStorageKey, JSON.stringify(val))));

    return subj;
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  /* tslint:disable:member-ordering */

  public readonly challenge$: BehaviorSubject<Readonly<Challenge>> = this.subject('challenge', GLOBAL, null);
  public get challenge() { return this.challenge$.value; }
  public set challenge(value) { this.challenge$.next(value); }

  public readonly nightMode$: BehaviorSubject<boolean> = this.subject('nightMode', GLOBAL, false);
  public get nightMode() { return this.nightMode$.value; }
  public set nightMode(value) { this.nightMode$.next(value); }

  public readonly notificationNoise$: BehaviorSubject<number> = this.subject('notificationNoise', GLOBAL, 1);
  public get notificationNoise() { return this.notificationNoise$.value; }
  public set notificationNoise(value) { this.notificationNoise$.next(value); }

  public readonly pressEnterToSend$: BehaviorSubject<boolean> = this.subject('pressEnterToSend', GLOBAL, true);
  public get pressEnterToSend() { return this.pressEnterToSend$.value; }
  public set pressEnterToSend(value) { this.pressEnterToSend$.next(value); }

  public readonly showMessageDetails$: BehaviorSubject<boolean> = this.subject('showMessageDetails', GLOBAL, true);
  public get showMessageDetails() { return this.showMessageDetails$.value; }
  public set showMessageDetails(value) { this.showMessageDetails$.next(value); }

  public readonly lastBannerSeen$: BehaviorSubject<string> = this.subject('lastBannerSeen', GLOBAL, null);
  public get lastBannerSeen() { return this.lastBannerSeen$.value; }
  public set lastBannerSeen(value) { this.lastBannerSeen$.next(value); }

  public readonly msgBoxContent$: BehaviorSubject<string> = this.subject('msgBoxContent', ROOM, '');
  public get msgBoxContent() { return this.msgBoxContent$.value; }
  public set msgBoxContent(value) { this.msgBoxContent$.next(value); }

  public readonly msgBoxVoice$: BehaviorSubject<RpVoiceSerialized> = this.subject('msgBoxVoice', ROOM, 'narrator') as BehaviorSubject<RpVoiceSerialized>;
  public get msgBoxVoice() { return this.msgBoxVoice$.value; }
  public set msgBoxVoice(value) { this.msgBoxVoice$.next(value); }

  public readonly recentCharas$: BehaviorSubject<RpCharaId[]> = this.subject('recentCharas', ROOM, []);
  public get recentCharas() { return this.recentCharas$.value; }
  public set recentCharas(value) { this.recentCharas$.next(value); }

}
