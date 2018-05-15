import { Injectable, OnDestroy } from '@angular/core';
import { ChallengeService, Challenge } from './challenge.service';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators/map';
import { pairwise } from 'rxjs/operators/pairwise';
import { filter } from 'rxjs/operators/filter';
import { mergeMap } from 'rxjs/operators/mergeMap';
import { first } from 'rxjs/operators/first';
import { debounceTime } from 'rxjs/operators/debounceTime';
import { of } from 'rxjs/observable/of';
import { TrackService } from '../../track.service';
import PouchDB from 'pouchdb';
import { REMOTE_COUCH } from '../../app.constants';
import * as cuid from 'cuid';
import sortedIndexBy from 'lodash-es/sortedIndexBy';
import { RpChara, RpCharaId } from '../models/rp-chara';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpVoice, RpVoiceSerialized } from '../models/rp-voice';

export type RpDoc = RpChara|RpMessage;

@Injectable()
export class RpService implements OnDestroy {

  private readonly challenge: Challenge;

  public readonly loaded: Promise<boolean>;
  public readonly notFound: Promise<boolean>;
  public readonly rpCode: string;
  public title: string = null;
  public desc: string = null;

  public messages: Readonly<RpMessage>[] = null;
  public messagesById: Map<RpMessageId, RpMessage> = null;
  public charas: Readonly<RpChara>[] = null;
  public charasById: Map<RpCharaId, RpChara> = null;

  private readonly docsSubject: Subject<RpDoc[]> = new ReplaySubject(1);

  public readonly messages$: Observable<RpMessage[]>;
  public readonly messagesById$: Observable<Map<RpMessageId, RpMessage>>;
  public readonly newMessages$: Observable<RpMessage>;

  public readonly charas$: Observable<RpChara[]>;
  public readonly charasById$: Observable<Map<RpCharaId, RpChara>>;

  private readonly db: PouchDB.Database<RpDoc>;
  private readonly remoteDb: PouchDB.Database<RpDoc>;

  private syncHandler: PouchDB.Replication.Sync<RpDoc>;
  private backoff = 1000;

  constructor(
    challengeService: ChallengeService,
    route: ActivatedRoute,
    private track: TrackService
  ) {

    this.rpCode = route.snapshot.paramMap.get('rpCode');
    this.challenge = challengeService.challenge;
    // TODO change all these
    this.title = 'FAKE TITLE';
    this.desc = 'FAKE DESC';

    // if it's safari, use the websql adapter, since the indexeddb one doesn't seem to work
    const adapter = navigator.userAgent.match(/Version\/[\d\.]+.*Safari/) ? 'websql' : undefined;
    this.db = new PouchDB(`room_${this.rpCode}`, { adapter });

    this.remoteDb = new PouchDB(`${REMOTE_COUCH}/room_${this.rpCode}`);

    // observables
    (async () => {

      let docs: RpDoc[] = (
        await this.db.allDocs({include_docs: true})
      ).rows.map(row => row.doc);

      this.docsSubject.next(docs);

      this.db.changes({
        since: 'now', live: true, include_docs: true
      }).on('change', change => {
        if (change.deleted) throw new Error('not yet implemented');

        const idx = sortedIndexBy(docs, change.doc, x => x._id);
        if (docs[idx] && docs[idx]._id === change.id) {
          // update
          docs = [...docs];
          docs[idx] = change.doc;
        } else {
          // insert
          docs = [...docs.slice(0, idx), change.doc, ...docs.slice(idx)];
        }
        this.docsSubject.next(docs);
      });

    })();

    const debouncedDocs$ = this.docsSubject.pipe(
      debounceTime(100)
    );

    this.messages$ = debouncedDocs$.pipe(
      map(docs => docs.filter(doc => doc.schema === 'message'))
    ) as Observable<RpMessage[]>;

    this.charas$ = debouncedDocs$.pipe(
      map(docs => docs.filter(doc => doc.schema === 'chara'))
    ) as Observable<RpChara[]>;

    this.messagesById$ = this.messages$.pipe(
      map(msgs => msgs.reduce((map, msg) => map.set(msg._id, msg), new Map()))
    );

    this.charasById$ = this.charas$.pipe(
      map(charas => charas.reduce((map, chara) => map.set(chara._id, chara), new Map()))
    );

    this.newMessages$ = this.messagesById$.pipe(
      pairwise(),
      filter(([a, b]) => a.size < b.size),
      mergeMap(([a, b]) => {
        const newMsgs: RpMessage[] = [];
        b.forEach((msg, id) => { if (!a.has(id)) newMsgs.push(msg); });
        return of(...newMsgs);
      })
    );

    // access values directly
    this.messages$.subscribe(messages => this.messages = messages);
    this.messagesById$.subscribe(messagesById => this.messagesById = messagesById);
    this.charas$.subscribe(charas => this.charas = charas);
    this.charasById$.subscribe(charasById => this.charasById = charasById);

    // initial offline update
    const loaded = debouncedDocs$.pipe(first()).toPromise();
    this.loaded = loaded.then(() => true);
    this.notFound = this.loaded.then(loaded => !loaded);

    // begin sync
    loaded.then(() => {
      this.db.replicate.from(
        this.remoteDb, { batch_size: 1000 }
      ).on('complete', () => this.sync());
    });

  }

  private sync() {
    if (this.syncHandler) {
      this.syncHandler.removeAllListeners();
      this.syncHandler.cancel();
    }
    this.syncHandler = this.db.sync(this.remoteDb, {live: true})
      .on('paused', err => {
        if (err) return console.error('BISECTED');
        this.backoff = 1000;
      })
      .on('error', err => {
        setTimeout(() => this.sync(), this.backoff);
        this.backoff += 1000;
      });
  }

  public async addMessage(content: string, voice: RpVoice) {
    const msg: RpMessage = {
      _id: cuid(),
      createdAt: new Date().toISOString(),
      schema: 'message',
      content,
      ... this.typeFromVoice(voice),
      challenge: this.challenge.hash
    };
    this.track.event('Messages', 'create', msg.type, content.length);

    await this.db.put(msg);
  }

  public async addChara(name: string, color: string) {
    const chara: RpChara = {
      _id: cuid(),
      createdAt: new Date().toISOString(),
      schema: 'chara',
      name,
      color
    };
    this.track.event('Charas', 'create');

    await this.db.put(chara);
    return chara;
  }

  public async addImage(url: string) {
    const msg: RpMessage = {
      _id: cuid(),
      createdAt: new Date().toISOString(),
      schema: 'message',
      type: 'image',
      url,
      challenge: this.challenge.hash
    };
    this.track.event('Messages', 'create', 'image');

    await this.db.put(msg);
  }

  public async editMessage(id: string, content: string) {
    this.track.event('Messages', 'edit', null, content.length);

    let msg: RpMessage = (await this.db.get(id)) as RpMessage;
    msg = {
      ...msg,
      content,
      editedAt: new Date().toISOString()
    };
    await this.db.put(msg);
    return msg;
  }

  // because rp service is provided in rp component, this is called when navigating away from an rp
  public ngOnDestroy() {
    this.db.close();
    this.docsSubject.complete();
  }

  public isSpecialVoice(voiceStr: RpVoiceSerialized) {
    return voiceStr === 'narrator' || voiceStr === 'ooc';
  }

  public typeFromVoice(voice: RpVoice): {type: 'narrator'|'ooc'|'chara', charaId?: RpCharaId} {
    if (typeof voice === 'string') return { type: voice };
    else return { type: 'chara', charaId: voice._id };
  }

  public getVoice(voiceStr: RpVoiceSerialized): RpVoice {
    if (this.isSpecialVoice(voiceStr)) {
      return voiceStr as 'narrator'|'ooc';
    } else {
      return this.charasById.get(voiceStr as RpCharaId);
    }
  }

}
