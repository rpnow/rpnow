import { Injectable } from '@angular/core';

@Injectable()
export class ChallengeService {

  public challenge$: Promise<{secret: string, hash: string}>

  constructor() {
    this.challenge$ = Promise.resolve({
      secret: "e736d265c798aba0278086e94636d32b30e4b7ed019c29b96fb9287d96bc1b33",
      hash: "a32ef4883a57ee6f0696bed47631895256d35016e3458522a050e1dd77de37db9e397a5ab2a9fa6f340cf4721ecd302644cbc27941724be189ff658ae3aa9df7"
    })
  }

}
