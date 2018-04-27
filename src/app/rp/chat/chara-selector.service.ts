import { Injectable, OnDestroy } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { RpVoice, RpService } from '../rp.service';
import { OptionsService } from '../options.service';
import { Subscription } from 'rxjs/Subscription';

@Injectable()
export class CharaSelectorService implements OnDestroy {

  private _menu: MatSidenav;

  private subscription: Subscription;

  get menu() {
    return this._menu;
  }

  public setInstance(instance: MatSidenav) {
    this._menu = instance;
  }

  public readonly currentChara$: BehaviorSubject<RpVoice>

  constructor(options: OptionsService, rp: RpService) {
    let voice = rp.getVoice(options.msgBoxVoice)
    this.currentChara$ = new BehaviorSubject(voice);

    this.subscription = this.currentChara$.subscribe(voice => options.msgBoxVoice$.next(typeof voice === 'string' ? voice : voice._id));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
