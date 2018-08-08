import { Injectable, OnDestroy } from '@angular/core';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara } from '../models/rp-chara';
import { RpVoiceSerialized, typeFromVoice } from '../models/rp-voice';
import { transformRpMessage } from '../models/parser';
import { BehaviorSubject } from 'rxjs';

interface ConversationPart {
  messages(input: {messages: RpMessage[], charas: RpChara[], userMsg: RpMessage}): RpMessage[];
  next(msg: RpMessage): string;
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
];

const PIC: string = PICS[Math.floor(Math.random() * PICS.length)].uri;

const CONVERSATION = new Map<string, ConversationPart>([
  ['start', {
    messages: () => [
      MSG('narrator', 'You see a young woman clad in a purple dress and a tall pointed hat. She greets you with a warm smile.'),
      MSG('c1', 'Hi! Welcome to the __RPNow Test Room!__ *curtsies*'),
      MSG('c1', "Let's get started -- __send your first message__ using the message box below!"),
    ],
    next: msg => msg.type !== 'image' ? (msg.type === 'chara' ? (msg.charaId === 'c1' ? '2rp' : '3') : '2') : null,
  }],
  ['2', {
    messages: () => [
      MSG('c1', 'Good job! :)'),
      MSG('c1', 'RPNow is fun because you can create lots of characters, like me! Click the __"Change Character"__ icon and __create a new character!__'),
    ],
    next: msg => msg.type === 'chara' ? (msg.charaId === 'c1' ? '2rp' : '3') : null,
  }],
  ['2rp', {
    messages: () => [
      MSG('c1', 'Hey, you sent a message as me!'),
      MSG('c1', 'Try creating a new character! Click the __"Change Character"__ icon and __create a new character!__ Then, send a message as them.'),
    ],
    next: msg => (msg.type === 'chara' && msg.charaId !== 'c1') ? '3' : null,
  }],
  ['3', {
    messages: ({ userMsg, charas }) => [
      MSG('c1', `Nice to meet you, ${charas.find(c => c._id === userMsg.charaId).name}!`),
      MSG('c1', "In RPNow, you can create __as many characters as you want!__ It's easy to switch between them."),
      MSG('c1', 'You can also post pictures! __Copy the link__ to this picture, and click the __"Post Image"__ icon:'),
      MSG('c1', PIC),
    ],
    next: msg => {
      if (msg.type === 'image') return '4';
      if (transformRpMessage(msg.content, null).indexOf('<a') >= 0) return '4bad';
      return null;
    },
  }],
  ['4bad', {
    messages: () => [
      MSG('c1', 'Rather than just sending the link in the chat box, click the __Post image__ icon.'),
    ],
    next: msg => msg.type === 'image' ? '4' : null,
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
    // next: () => null,
    next: msg => (transformRpMessage(msg.content, null).indexOf('<') >= 0) ? '5' : null,
  }],
  ['5', {
    messages: () => [
      MSG('c1', 'Nice! Well, that covers the basics.'),
      MSG('c1', "There's more to do in a real RP, such as viewing the archive, downloading a transcript, and changing options (like night mode.)"),
      MSG('c1', 'Click the __back arrow__ to return to the homepage and create your first RP. Have fun! ★'),
    ],
    next: () => null,
  }],
]);

@Injectable()
export class DemoRoomService implements OnDestroy {
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
    this.triggerNext(msg);
  }

  addChara(chara: RpChara) {
    this.charasSubject.next([...this.charasSubject.value, chara]);
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

  triggerNext(userMsg) {
    if (!this.conversationState) {
      this.conversationState = 'start';
    } else {
      const next = CONVERSATION.get(this.conversationState).next(userMsg);

      if (next) this.conversationState = next;
      else return;
    }

    const messages = this.messagesSubject.value;
    const charas = this.charasSubject.value;
    CONVERSATION.get(this.conversationState).messages({
      userMsg,
      messages,
      charas,
    }).forEach((msg, i) => {
      setTimeout(() => {
        this.messagesSubject.next([...this.messagesSubject.value, msg]);
      }, i * 2500 + 500);
    });
  }
}
