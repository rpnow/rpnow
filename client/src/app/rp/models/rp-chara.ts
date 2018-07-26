export type RpCharaId = string;

export interface RpChara {
  _id?: RpCharaId;
  timestamp?: number;
  ipid?: string;
  name: string;
  color: string;
}
