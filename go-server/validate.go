package main

import (
	"fmt"
	"regexp"
)

func (r RoomInfo) Validate() error {
	if len([]rune(r.Title)) > 30 {
		return fmt.Errorf("RoomInfo: title is too long (%d runes)", len([]rune(r.Title)))
	}
	return nil
}

func (m RpMessageBody) Validate() error {
	if m.Type == "image" {
		if m.Content != "" {
			return fmt.Errorf("Msg: image should not have 'content'")
		}
		if m.CharaID != "" {
			return fmt.Errorf("Msg: image should not have 'charaId'")
		}
		if len(m.URL) > 1000 {
			return fmt.Errorf("Msg: url is too long (%d bytes)", len(m.URL))
		}
		urlRegexp := regexp.MustCompile("^https?://[-A-Za-z0-9+&@#/%?=~_|!:,.;*]+$")
		if !urlRegexp.MatchString(m.URL) {
			return fmt.Errorf("Msg: url is invalid: %s", m.URL)
		}
		return nil
	} else if m.Type == "narrator" || m.Type == "chara" || m.Type == "ooc" {
		if m.URL != "" {
			return fmt.Errorf("Msg: non-image should not have 'url'")
		}
		if m.Content == "" {
			return fmt.Errorf("Msg: content is empty")
		}
		if len([]rune(m.Content)) > 65535 {
			return fmt.Errorf("Msg: content is too long (%d runes)", len([]rune(m.Content)))
		}
		if m.Type == "chara" {
			if m.CharaID == "" {
				return fmt.Errorf("Msg: charaId is empty")
			}
		} else {
			if m.CharaID != "" {
				return fmt.Errorf("Msg: non-chara msg should not have 'charaId'")
			}
		}
		return nil
	} else {
		return fmt.Errorf("Msg: invalid type")
	}
}

func (m RpMessageBody) CheckRelations(rpid string, db *database) error {
	if m.Type == "chara" {
		if db.getChara(rpid, m.CharaID) == nil {
			return fmt.Errorf("Msg with invalid chara id: %s", m.CharaID)
		}
	}
	return nil
}

func (c RpCharaBody) Validate() error {
	if len(c.Name) == 0 {
		return fmt.Errorf("Chara: name is empty")
	}
	if len([]rune(c.Name)) > 30 {
		return fmt.Errorf("Chara: name is too long (%d runes)", len([]rune(c.Name)))
	}
	colorRegexp := regexp.MustCompile("^#[0-9a-f]{6}$")
	if !colorRegexp.MatchString(c.Color) {
		return fmt.Errorf("Chara: color is invalid")
	}
	return nil
}

func (c RpCharaBody) CheckRelations(rpid string, db *database) error {
	return nil
}
