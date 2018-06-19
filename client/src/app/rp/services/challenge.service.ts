import { Injectable } from '@angular/core';
import * as shaJs from 'sha.js';
import { OptionsService } from './options.service';

export interface Challenge {
  secret: string;
  hash: string;
}

@Injectable()
export class ChallengeService {

  public challenge: Challenge;

  constructor(private options: OptionsService) {
    if (this.options.challenge) {
      this.challenge = this.options.challenge;
    } else {
      this.challenge = this.options.challenge = this.createChallenge();
    }
  }

  private createChallenge(): Challenge {
    const bytes = new Uint32Array(64 / 8);
    (window.crypto || <Crypto>window['msCrypto']).getRandomValues(bytes);

    const secret = Array.from(bytes, str => str.toString(16).padStart(8, '0')).join('');

    const hash = shaJs('sha512').update(secret).digest('hex');

    return { secret, hash };
  }

}
