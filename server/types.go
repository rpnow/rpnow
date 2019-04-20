package main

import (
	"encoding/json"
	"io"
	"strings"
	"time"

	"github.com/mitchellh/go-wordwrap"
)

type RoomInfo struct {
	RPID      string    `json:"rpid"`
	Title     string    `json:"title"`
	ReadCode  string    `json:"readCode"`
	StartTime time.Time `json:"createdAt"`
}

// SlugInfo describes what URL corresponds to what RP
type SlugInfo struct {
	Slug   string `json:"slug"`
	Rpid   string `json:"rpid"`
	Access string `json:"access"`
}

type Doc interface {
	Meta() *DocMeta
	ParseBody(io.Reader) error
	Validate() error
	CheckRelations(rpid string, db *database) error
}

type DocMeta struct {
	ID        string    `json:"_id"`
	Revision  int       `json:"revision"`
	Timestamp time.Time `json:"timestamp"`
	Userid    string    `json:"userid"`
}

type RpMessageBody struct {
	Type    string `json:"type"`
	Content string `json:"content,omitempty"`
	URL     string `json:"url,omitempty"`
	CharaID string `json:"charaId,omitempty"`
}
type RpMessage struct {
	*RpMessageBody
	*DocMeta
}

func NewRpMessage() RpMessage {
	return RpMessage{&RpMessageBody{}, &DocMeta{}}
}

func (x RpMessage) ParseBody(j io.Reader) error {
	return json.NewDecoder(j).Decode(x.RpMessageBody)
}

func (x RpMessage) Meta() *DocMeta {
	return x.DocMeta
}

type RpCharaBody struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}
type RpChara struct {
	*RpCharaBody
	*DocMeta
}

func NewRpChara() RpChara {
	return RpChara{&RpCharaBody{}, &DocMeta{}}
}

func (x RpChara) ParseBody(j io.Reader) error {
	return json.NewDecoder(j).Decode(x.RpCharaBody)
}

func (x RpChara) Meta() *DocMeta {
	return x.DocMeta
}

func (m RpMessage) ToTxt(chara *RpChara) string {
	switch m.Type {
	case "chara":
		return strings.ToUpper(chara.Name) + ":\r\n  " + strings.Replace(wordwrap.WrapString(m.Content, 70), "\n", "\r\n  ", 0)
	case "ooc":
		return strings.Replace(wordwrap.WrapString("(( OOC: "+m.Content+" ))", 72), "\n", "\r\n", 0)
	case "narrator":
		return strings.Replace(wordwrap.WrapString(m.Content, 72), "\n", "\r\n", 0)
	case "image":
		return "--- IMAGE ---\r\n" + m.URL + "\r\n-------------"
	default:
		panic("What kind of message is this?")
	}
}

type chatStreamMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type exportFirstBlock struct {
	Title  string        `json:"title"`
	Charas []exportChara `json:"charas"`
}
type exportChara struct {
	Timestamp time.Time `json:"timestamp"`
	*RpCharaBody
}
type exportMessage struct {
	Timestamp time.Time `json:"timestamp"`
	*RpMessageBody
	CharaID *int `json:"charaId,omitempty"`
}
