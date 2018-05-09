export interface RpMessage {
  schema: 'message';
  _id?: string;
  createdAt: string;
  editedAt?: string;
  type: 'narrator'|'ooc'|'chara'|'image';
  content?: string;
  charaId?: string;
  challenge?: string;
  url?: string;
  ipid?: string;
}
