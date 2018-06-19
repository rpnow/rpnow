export type RpCharaId = number;

export interface RpChara {
  id?: RpCharaId;
  createdAt: string;
  editedAt?: string;
  name: string;
  color: string;
}
