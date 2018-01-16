import { Injectable } from '@angular/core';
import { SHA512, enc } from 'crypto-js';

export interface Challenge {
  secret: string,
  hash: string
}

@Injectable()
export class ChallengeService {

  public challenge: Challenge

  constructor() {
    let bytes = new Uint32Array(64/8);
    window.crypto.getRandomValues(bytes);

    let secret = Array.from(bytes, str => str.toString(16).padStart(8, '0')).join('');

    let hash = SHA512(secret).toString(enc.Hex)

    this.challenge = { secret, hash };
  }

}
