package main

import (
	"fmt"
	"regexp"
)

// RpChatState is the current state of an RP's chat
type RpChatState struct {
	*RpHeader
	Msgs     []RpMessage `json:"msgs"`
	Charas   []RpChara   `json:"charas"`
	LastSeq  int         `json:"lastEventId"`
	ReadCode string      `json:"readCode"`
}

type RpChatUpdates struct {
	Updates []interface{} `json:"updates"`
	LastSeq int           `json:"lastEventId"`
}

// SlugInfo describes what URL corresponds to what RP
type SlugInfo struct {
	Rpid string `json:"rpid"`
}

// RpHeader holds info about the RP's title, and (later?) other RP metadata
type RpHeader struct {
	Title string `json:"title"`
}

type RpMessageBody struct {
	Type    string `json:"type"`
	Content string `json:"content"`
	URL     string `json:"url"`
	CharaID string `json:"charaId,omitempty"`
}

type RpMessage struct {
	*RpMessageBody
}

type RpCharaBody struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type RpChara struct {
	*RpCharaBody
}

func (m *RpMessageBody) Validate() error {
	if m.Type == "image" {
		if m.Content != "" {
			return fmt.Errorf("Msg: image should not have 'content'")
		}
		if m.CharaID != "" {
			return fmt.Errorf("Msg: image should not have 'charaId'")
		}
		urlRegexp := regexp.MustCompile("^https?://[-A-Za-z0-9+&@#/%?=~_|!:,.;]+$")
		if urlRegexp.MatchString(m.URL) {
			return fmt.Errorf("Msg: url is invalid")
		}
		return nil
	} else if m.Type == "narrator" || m.Type == "chara" || m.Type == "ooc" {
		if m.URL != "" {
			return fmt.Errorf("Msg: non-image should not have 'url'")
		}
		if m.Content == "" {
			return fmt.Errorf("Msg: content is empty")
		}
		if len(m.Content) > 10000 {
			return fmt.Errorf("Msg: content is too long (%d characters)", len(m.Content))
		}
		if m.Type == "chara" {
			if m.CharaID == "" {
				return fmt.Errorf("Msg: charaId is empty")
			}
			// TODO check if the doc is in the db
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

func (c *RpCharaBody) Validate() error {
	if len(c.Name) == 0 {
		return fmt.Errorf("Chara: name is empty")
	}
	if len(c.Name) > 30 {
		return fmt.Errorf("Chara: name is too long")
	}
	colorRegexp := regexp.MustCompile("^#[0-9a-f]{6}$")
	if !colorRegexp.MatchString(c.Color) {
		return fmt.Errorf("Chara: color is invalid")
	}
	return nil
}
