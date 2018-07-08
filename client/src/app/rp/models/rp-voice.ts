import { RpChara, RpCharaId } from './rp-chara';

export type RpVoice = RpChara|'narrator'|'ooc';

export type RpVoiceSerialized = RpCharaId|'narrator'|'ooc';

export function isSpecialVoice(voiceStr: RpVoice|RpVoiceSerialized): voiceStr is 'narrator'|'ooc' {
  return voiceStr === 'narrator' || voiceStr === 'ooc';
}

export function typeFromVoice(voice: RpVoice): {type: 'narrator'|'ooc'|'chara', charaId?: RpCharaId} {
  if (voice === 'narrator' || voice === 'ooc') {
    return { type: voice };
  } else {
    return { type: 'chara', charaId: voice._id };
  }
}
