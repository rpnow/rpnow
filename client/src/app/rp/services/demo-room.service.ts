import { Injectable, OnDestroy } from '@angular/core';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara, RpCharaId } from '../models/rp-chara';
import { RpVoiceSerialized, typeFromVoice } from '../models/rp-voice';
import { transformRpMessage } from '../models/parser';
import { BehaviorSubject } from 'rxjs';
import { TrackService } from '../../track.service';

interface ConversationPart {
  messages(input: {messages: RpMessage[], charas: RpChara[], userMsg?: RpMessage, userChara?: RpChara}): RpMessage[];
  onMessage(msg: RpMessage): string;
  onChara(chara: RpChara): string;
}

function MSG(voice: RpVoiceSerialized, content: string) {
  return {
    _id: Date.now() + '' + Math.random(),
    timestamp: Date.now() / 1000,
    content,
    ...typeFromVoice(voice),
  };
}

const PICS = [
  {
    uri: 'https://pbs.twimg.com/media/DiGi4JCUYAATXAy.jpg',
    author: 'Himi https://twitter.com/SugoiBanana_',
  },
  {
    uri: 'https://78.media.tumblr.com/be81b19872926ee3388ebf12c12c8c01/tumblr_ood5t2VSVM1urbwufo1_1280.png',
    author: 'Nin_Ei https://www.instagram.com/nin_ei'
  },
  {
    uri: 'https://78.media.tumblr.com/3baf5e9d0d727a165bdeb0fba6a176b4/tumblr_messaging_pc58rrB63F1qmy8yj_1280.jpg',
    author: 'Sillybro https://www.instagram.com/bearuto'
  }
];

const PIC: string = PICS[Math.floor(Math.random() * PICS.length)].uri;

const CONVERSATION = new Map<string, ConversationPart>([
  ['start', {
    messages: () => [
      MSG('narrator', 'You see a young woman clad in a purple dress and a tall pointed hat. She greets you with a warm smile.'),
      MSG('c1', 'Hi! Welcome to the __RPNow Test Room!__ *curtsies*'),
      MSG('c1', "Let's get started -- __send your first message__ using the message box below!"),
    ],
    onMessage: msg => msg.type !== 'image' ? (msg.type === 'chara' ? (msg.charaId === 'c1' ? '2rp' : '3') : '2') : null,
    onChara: () => null,
  }],
  ['2', {
    messages: () => [
      MSG('c1', 'Good job! :)'),
      MSG('c1', 'RPNow is fun because you can create lots of characters, like me! Click the __"Change Character"__ icon and __create a new character!__'),
    ],
    onMessage: msg => msg.charaId === 'c1' ? '2rp' : null,
    onChara: () => '2then',
  }],
  ['2rp', {
    messages: () => [
      MSG('c1', 'Hey, you sent a message as me!'),
      MSG('c1', 'Try creating a new character! Click the __"Change Character"__ icon and __create a new character!__'),
    ],
    onMessage: msg => null,
    onChara: () => '2then',
  }],
  ['2then', {
    messages: () => [
      MSG('c1', 'OK! Now send a message!'),
    ],
    onMessage: msg => (msg.type === 'chara' && msg.charaId !== 'c1') ? '3' : null,
    onChara: () => null,
  }],
  ['3', {
    messages: ({ userMsg, charas }) => [
      MSG('c1', `Nice to meet you, ${charas.find(c => c._id === userMsg.charaId).name}!`),
      MSG('c1', "In RPNow, you can create __as many characters as you want!__ It's easy to switch between them."),
      MSG('c1', 'You can also post pictures! __Copy the link__ to this picture, and click the __"Post Image"__ icon:'),
      MSG('c1', PIC),
    ],
    onMessage: msg => {
      if (msg.type === 'image') return '4';
      if (transformRpMessage(msg.content, null).indexOf('<a') >= 0) return '4bad';
      return null;
    },
    onChara: () => null,
  }],
  ['4bad', {
    messages: () => [
      MSG('c1', 'Rather than just sending the link in the chat box, click the __Post image__ icon.'),
    ],
    onMessage: msg => msg.type === 'image' ? '4' : null,
    onChara: () => null,
  }],
  ['4', {
    messages: ({ userMsg }) => [
      MSG('c1', (function() {
        const pic = PICS.find(p => p.uri === userMsg.url);
        if (pic) return `That's me! (Art credit: ${pic.author})`;
        else return "That's a different picture, but that's okay!";
      }())),
      MSG('c1', 'How about some text formatting, like _italics_, __bold__ and ~~strikethrough~~? You can also indicate actions like this: *grins*'),
      MSG('c1', 'Click the __Formatting info__ icon to see how. Try formatting something!'),
    ],
    onMessage: msg => (transformRpMessage(msg.content, null).indexOf('<') >= 0) ? '5' : null,
    onChara: () => null,
  }],
  ['5', {
    messages: () => [
      MSG('c1', 'Nice! Well, that covers the basics.'),
      MSG('c1', "There's more to do in a real RP, such as viewing the archive, downloading a transcript, and changing options (like night mode.)"),
      MSG('c1', 'Click the __back arrow__ to return to the homepage and create your first RP. Have fun! ★'),
    ],
    onMessage: () => 'ps1',
    onChara: () => null,
  }],
  ['ps1', {
    messages: () => [
      MSG('c1', 'Take care!'),
      MSG('ooc', 'hey, this is nigel, creator of RPNow. if you ever have any issues with the site, let me know!'),
      MSG('ooc', 'my email: rpnow.net@gmail.com'),
    ],
    onMessage: () => 'ps2',
    onChara: () => null,
  }],
  ['ps2', {
    messages: () => [
      MSG('ooc', 'this is the last message! bye!'),
    ],
    onMessage: () => null,
    onChara: () => null,
  }],
]);

@Injectable()
export class DemoRoomService implements OnDestroy {
  constructor(
    private track: TrackService,
  ) {}

  private readonly messagesSubject = new BehaviorSubject<RpMessage[]>([]);
  private readonly charasSubject = new BehaviorSubject<RpChara[]>([
    {
      _id: 'c1',
      name: 'Ruella Prunella',
      color: '#8a4fdb',
    }
  ]);

  private conversationState: string;

  readonly messages$ = this.messagesSubject.asObservable();
  readonly charas$ = this.charasSubject.asObservable();

  ngOnDestroy() {
    this.messagesSubject.complete();
    this.charasSubject.complete();
  }

  addMessage(msg: RpMessage) {
    this.messagesSubject.next([...this.messagesSubject.value, msg]);
    this.onUserMessage(msg);
  }

  addChara(chara: RpChara) {
    this.charasSubject.next([...this.charasSubject.value, chara]);
    this.onUserChara(chara);
  }

  editMessageContent(id: RpMessageId, content: string) {
    const messages = [...this.messagesSubject.value];
    const idx = messages.findIndex(m => m._id === id);
    const msg: RpMessage = {
      ...messages[idx],
      content,
      edited: Date.now() / 1000
    };
    messages[idx] = msg;
    this.messagesSubject.next(messages);
  }

  deleteMesage(id: RpMessageId) {
    const messages = [...this.messagesSubject.value];
    const idx = messages.findIndex(m => m._id === id);
    const msg: RpMessage = {
      ...messages[idx],
      deleted: true,
    };
    messages[idx] = msg;
    this.messagesSubject.next(messages);
  }

  undeleteMesage(id: RpMessageId) {
    const messages = [...this.messagesSubject.value];
    const idx = messages.findIndex(m => m._id === id);
    const msg: RpMessage = {
      ...messages[idx],
      deleted: false,
    };
    messages[idx] = msg;
    this.messagesSubject.next(messages);
  }

  editChara(id: RpCharaId, name: string, color: string) {
    const charas = [...this.charasSubject.value];
    const idx = charas.findIndex(c => c._id === id);
    const chara: RpChara = {
      ...charas[idx],
      name,
      color,
      edited: Date.now() / 1000
    };
    charas[idx] = chara;
    this.charasSubject.next(charas);
  }

  start() {
    this.conversationState = 'start';
    this.doConversationStep({});
  }

  onUserMessage(userMsg) {
    const next = CONVERSATION.get(this.conversationState).onMessage(userMsg);

    this.track.event('Demo', 'Create message', `${this.conversationState} to ${next || '(itself)'}`);

    if (next) {
      this.conversationState = next;
      this.doConversationStep({ userMsg });
    }
  }

  onUserChara(userChara) {
    const next = CONVERSATION.get(this.conversationState).onChara(userChara);

    this.track.event('Demo', 'Create chara', `${this.conversationState} to ${next || '(itself)'}`);

    if (next) {
      this.conversationState = next;
      this.doConversationStep({ userChara });
    }
  }

  private doConversationStep(userUpdates: { userMsg?: RpMessage, userChara?: RpChara }) {
    const messages = this.messagesSubject.value;
    const charas = this.charasSubject.value;
    let delay = 1500;

    const conversation = CONVERSATION.get(this.conversationState).messages({
      ...userUpdates,
      messages,
      charas,
    });

    for (const msg of conversation) {
      setTimeout(() => {
        this.messagesSubject.next([...this.messagesSubject.value, msg]);
      }, delay);

      delay += msg.content.length * 33 + 2000;
    }
  }
}
