export type RpCharaId = string;

export interface RpChara {
  _id?: RpCharaId;
  timestamp?: number;
  edited?: number;
  ipid?: string;
  challenge?: string;
  name: string;
  color: string;
}
