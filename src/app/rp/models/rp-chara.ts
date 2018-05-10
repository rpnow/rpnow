export type RpCharaId = string;

export interface RpChara {
  schema: 'chara';
  createdAt: string;
  editedAt?: string;
  _id?: RpCharaId;
  name: string;
  color: string;
}
