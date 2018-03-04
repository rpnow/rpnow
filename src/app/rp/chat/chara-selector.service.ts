import { Injectable } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { RpVoice, RpService } from '../rp.service';
import { OptionsService } from '../options.service';

@Injectable()
export class CharaSelectorService {

  private _menu: MatSidenav;

  get menu() {
    return this._menu;
  }

  public setInstance(instance: MatSidenav) {
    this._menu = instance;
  }

  public readonly currentChara$: BehaviorSubject<RpVoice>

  constructor(options: OptionsService, rp: RpService) {
    let voice = (typeof options.msgBoxVoice === 'string') ? options.msgBoxVoice : rp.charasById[options.msgBoxVoice];
    this.currentChara$ = new BehaviorSubject(voice);

    this.currentChara$.subscribe(voice => options.msgBoxVoice$.next(typeof voice === 'string' ? voice : voice.id));
  }

}
