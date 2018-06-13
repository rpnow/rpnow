export type RpCharaId = string;

export interface RpChara {
  _id?: RpCharaId;
  createdAt: string;
  editedAt?: string;
  name: string;
  color: string;
}
