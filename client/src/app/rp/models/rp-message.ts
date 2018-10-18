import { RpCharaId } from './rp-chara';

export type RpMessageId = string;

export type RpMessageType = 'narrator'|'ooc'|'chara'|'image';

export interface RpMessage {
  _id?: RpMessageId;
  timestamp: number;
  edited?: number;
  type: RpMessageType;
  content?: string;
  charaId?: RpCharaId;
  challenge?: string;
  url?: string;
  ipid?: string;
  deleted?: boolean;
}
