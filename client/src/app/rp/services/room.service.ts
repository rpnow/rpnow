import { Injectable } from '@angular/core';
import { Observable, Observer, of } from 'rxjs';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara } from '../models/rp-chara';
import { environment } from '../../../environments/environment';
import { RpVoice, typeFromVoice } from '../models/rp-voice';
import { TrackService } from '../../track.service';
import { HttpClient } from '@angular/common/http';

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
    private http: HttpClient,
    private track: TrackService
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

}
