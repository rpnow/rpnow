import { RpChara, RpCharaId } from "./rp-chara";

export type RpVoice = RpChara|'narrator'|'ooc';

export type RpVoiceSerialized = RpCharaId|'narrator'|'ooc';
