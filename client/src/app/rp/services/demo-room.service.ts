import { Injectable, ApplicationRef } from '@angular/core';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara } from '../models/rp-chara';
import { RpVoiceSerialized, typeFromVoice } from '../models/rp-voice';

interface ConversationPart {
  messages: RpMessage[];
  requirement(msg: RpMessage): boolean;
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

const CONVERSATION: ConversationPart[] = [
  {
    requirement(msg: RpMessage) { return true; },
    messages: [
      MSG('narrator', 'Welcome to the RPNow demo!'),
      MSG('narrator', 'Send your first message using the box below!'),
    ],
  },
  {
    requirement(msg: RpMessage) { return msg.type !== 'image'; },
    messages: [
      MSG('narrator', 'Good job!'),
      MSG('narrator', 'You can create characters too.'),
      MSG('narrator', 'Try it!'),
    ],
  },
  {
    requirement(msg: RpMessage) { return msg.type === 'chara'; },
    messages: [
      MSG('narrator', 'great!'),
      MSG('narrator', 'goodbye!'),
    ],
  },
  {
    requirement() { return false; },
    messages: [],
  }

];

@Injectable()
export class DemoRoomService {
  messages: RpMessage[] = [];
  charas: RpChara[] = [];

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
    if (!CONVERSATION[0].requirement(userMsg)) return;

    CONVERSATION.shift().messages.forEach((msg, i) => {
      setTimeout(() => {
        this.messages = [...this.messages, msg];
      }, i * 1500 + 500);
    });
  }
}
