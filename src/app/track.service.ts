import { Injectable } from '@angular/core';
import { Angulartics2 } from 'angulartics2';

@Injectable()
export class TrackService {

  constructor(private angulartics: Angulartics2) { }

  event(category: string, action: string, label?: string, value?: number, noninteraction?: boolean) {
    this.angulartics.eventTrack.next({
      action,
      properties: {
        category, label, value, noninteraction
      }
    })
  }

}
