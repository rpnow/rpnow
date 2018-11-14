import { Injectable } from '@angular/core';
import { Observable, Observer, of } from 'rxjs';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara } from '../models/rp-chara';
import { environment } from '../../../environments/environment';
import { RpVoice, typeFromVoice, RpVoiceSerialized } from '../models/rp-voice';
import { TrackService } from '../../track.service';
import { HttpClient } from '@angular/common/http';
import { ChallengeService } from './challenge.service';

export interface RpPageResponse {
  title: string;
  desc?: string;
  msgs: RpMessage[];
  charas: RpChara[];
  pageCount: number;
  msgCount: number;
}

@Injectable()
export class RoomService {

  constructor(
    private challengeService: ChallengeService,
    private http: HttpClient,
    private track: TrackService,
  ) {}

  // getChatStream(rpCode: string): Observable<Partial<RpPageResponse>> {
  //   return Observable.create((observer: Observer<string>) => {
  //     const socket = io(`${environment.apiUrl}/room`, { query: `rpCode=${rpCode}` });

  //     socket.on('message', message => {
  //       if (message.error) {
  //         observer.error(message.error);
  //       } else {
  //         observer.next(message);
  //       }
  //     });

  //     return () => socket.close();
  //   });
  // }

  getPage(rpCode: string, page: number) {
    const url = `${environment.apiUrl}/api/rp/${rpCode}/page/${page}`;
    return this.http.get(url) as Observable<RpPageResponse>;
  }

  async addMessage(rpCode: string, content: string, voice: RpVoice) {
    const challenge = await this.challengeService.challenge$;

    const msg: Partial<RpMessage> = {
      content,
      ... typeFromVoice(voice),
      challenge: challenge.hash
    };
    this.track.event('RP', 'Create message', msg.type, content.length);

    const receivedMsg: RpMessage = await this.http.post(`${environment.apiUrl}/api/rp/${rpCode}/message`, msg).toPromise() as RpMessage;
    // this.newMessagesSubject.next(receivedMsg);

    return receivedMsg;
  }

  async addChara(rpCode: string, name: string, color: string) {
    const challenge = await this.challengeService.challenge$;

    const chara: Partial<RpChara> = {
      name,
      color,
      challenge: challenge.hash
    };
    this.track.event('RP', 'Create chara');

    const receivedChara: RpChara = await this.http.post(`${environment.apiUrl}/api/rp/${rpCode}/chara`, chara).toPromise() as any;
    // this.newCharasSubject.next(receivedChara);

    return receivedChara;
  }

  async addImage(rpCode: string, url: string) {
    const msg = { url };
    this.track.event('RP', 'Create image');

    const receivedMsg: RpMessage = await this.http.post(`${environment.apiUrl}/api/rp/${rpCode}/image`, msg).toPromise() as any;
    // this.newMessagesSubject.next(receivedMsg);

    return receivedMsg;
  }

  async editMessage(rpCode: string, id: RpMessageId, content: string, voice: RpVoiceSerialized) {
    const challenge = await this.challengeService.challenge$;

    const editInfo = {
      content,
      ... typeFromVoice(voice),
      secret: challenge.secret
    };
    this.track.event('RP', 'Edit message', null, content.length);

    const msg: RpMessage = await this.http.put(`${environment.apiUrl}/api/rp/${rpCode}/message/${id}`, editInfo).toPromise() as any;
    // this.editedMessagesSubject.next(msg);
  }

  async editChara(rpCode: string, id: RpMessageId, name: string, color: string) {
    const challenge = await this.challengeService.challenge$;

    const editInfo = {
      name,
      color,
      secret: challenge.secret
    };
    this.track.event('RP', 'Edit chara');

    const chara: RpChara = await this.http.put(`${environment.apiUrl}/api/rp/${rpCode}/chara/${id}`, editInfo).toPromise() as any;
    // this.editedMessagesSubject.next(msg);
  }

}
