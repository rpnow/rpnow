import { Injectable } from '@angular/core';
import { OptionsService } from './options.service';
import { RpService } from './rp.service';

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

  constructor(
    private rp: RpService,
    private options: OptionsService
  ) {
    this.rp.newMessages$.subscribe(msg => {
      let audio = noises[options.notificationNoise].audio;
      
      if (audio) audio.play();
    })
  }

}
