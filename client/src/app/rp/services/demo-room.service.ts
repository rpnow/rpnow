import { Injectable, ApplicationRef } from '@angular/core';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara } from '../models/rp-chara';
import { RpVoiceSerialized, typeFromVoice } from '../models/rp-voice';

interface ConversationPart {
  messages(input: {messages: RpMessage[], charas: RpChara[], userMsg: RpMessage}): RpMessage[];
  next(msg: RpMessage): string;
  sideEffects?(): void;
}

function MSG(voice: RpVoiceSerialized, content: string) {
  return {
    _id: Date.now() + '' + Math.random(),
    timestamp: Date.now() / 1000,
    content,
    ...typeFromVoice(voice),
  };
}

const CONVERSATION = new Map<string, ConversationPart>([
  ['start', {
    messages: () => [
      MSG('narrator', 'You see a young woman clad in a purple dress and a tall pointed hat. She greets you with a warm smile.'),
      MSG('c1', 'Hi! Welcome to the __RPNow Test Room!__ *bows*'),
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
      MSG('c1', 'RPNow is great because you can create as many characters as you want!'),
    ],
    next: () => null,
  }],
]);

@Injectable()
export class DemoRoomService {
  messages: RpMessage[] = [];
  charas: RpChara[] = [
    {
      _id: 'c1',
      name: 'Ruella Prunella',
      color: '#8a4fdb',
    }
  ];

  conversationState: string;

  addMessage(msg: RpMessage) {
    this.messages = [...this.messages, msg];
    this.triggerNext(msg);
  }

  addChara(chara: RpChara) {
    this.charas = [...this.charas, chara];
  }

  editMessageContent(id: RpMessageId, content: string) {
    const idx = this.messages.findIndex(m => m._id === id);
    const msg: RpMessage = {
      ...this.messages[idx],
      content,
      edited: Date.now() / 1000
    };
    this.messages = [...this.messages];
    this.messages[idx] = msg;
  }

  triggerNext(userMsg) {
    if (!this.conversationState) {
      this.conversationState = 'start';
    } else {
      const next = CONVERSATION.get(this.conversationState).next(userMsg);

      if (next) this.conversationState = next;
      else return;
    }

    CONVERSATION.get(this.conversationState).messages({
      userMsg,
      messages: this.messages,
      charas: this.charas
    }).forEach((msg, i) => {
      setTimeout(() => {
        this.messages = [...this.messages, msg];
      }, i * 1500 + 500);
    });
  }
}
