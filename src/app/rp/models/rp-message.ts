import { RpCharaId } from './rp-chara';

export type RpMessageId = string;

export interface RpMessage {
  schema: 'message';
  _id?: RpMessageId;
  createdAt: string;
  editedAt?: string;
  type: 'narrator'|'ooc'|'chara'|'image';
  content?: string;
  charaId?: RpCharaId;
  challenge?: string;
  url?: string;
  ipid?: string;
}
