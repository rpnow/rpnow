import { Injectable } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';

@Injectable()
export class MainMenuService {

  private _menu: MatSidenav;

  get menu() {
    return this._menu;
  }

  setInstance(instance: MatSidenav) {
    this._menu = instance;
  }

}
