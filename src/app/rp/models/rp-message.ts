import { RpCharaId } from './rp-chara';

export type RpMessageId = number;

export type RpMessageType = 'narrator'|'ooc'|'chara'|'image';

export interface RpMessage {
  id?: RpMessageId;
  createdAt: string;
  editedAt?: string;
  type: RpMessageType;
  content?: string;
  charaId?: RpCharaId;
  challenge?: string;
  url?: string;
  ipid?: string;
}
