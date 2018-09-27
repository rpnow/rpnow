import { Injectable } from '@angular/core';
import { OptionsService } from './options.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Challenge {
  secret: string;
  hash: string;
}

@Injectable()
export class ChallengeService {

  public challenge$: Promise<Challenge>;

  constructor(
    private options: OptionsService,
    private http: HttpClient,
  ) {
    if (this.options.challenge) {
      this.challenge$ = Promise.resolve(this.options.challenge);
    } else {
      this.challenge$ = this.createChallenge();
      this.challenge$.then(challenge => this.options.challenge = challenge);
    }
  }

  private async createChallenge() {
    return <Challenge>(await this.http.get(environment.apiUrl + '/api/challenge.json').toPromise());
  }

}
