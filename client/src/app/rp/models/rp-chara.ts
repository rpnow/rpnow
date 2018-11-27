export type RpCharaId = string;

export interface RpChara {
  _id?: RpCharaId;
  timestamp: string;
  revision: number;
  ipid?: string;
  challenge?: string;
  name: string;
  color: string;
}
