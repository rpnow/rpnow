package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"gopkg.in/AlecAivazis/survey.v1"
)

func main() {
	fmt.Println("RPNow Admin Console")

	err := checkStatus()
	if err != nil {
		panic(err)
	}
	rps, err := getRpList()
	if err != nil {
		panic(err)
	}

	for {
		rp := pickRp(rps)
		if rp == nil {
			break
		}
		fmt.Println(rp)
	}
}

func checkStatus() error {
	fmt.Print("Getting server status... ")

	res, err := http.Get("http://127.0.0.1:12789/status")
	if err != nil {
		return err
	}
	defer res.Body.Close()
	var status struct {
		RPNowLine string `json:"rpnow"`
		PID       int    `json:"pid"`
	}
	err = json.NewDecoder(res.Body).Decode(&status)
	if err != nil {
		return err
	}
	fmt.Println(status.RPNowLine)
	return nil
}

func pickRp(rps []rpInfo) *rpInfo {
	strings := make([]string, len(rps))
	stringMap := make(map[string]*rpInfo)
	for i, v := range rps {
		str := v.String()
		strings[i] = str
		stringMap[str] = &v
	}
	var choiceStr string
	prompt := &survey.Select{
		Message: "Choose an RP:",
		Options: strings,
	}
	survey.AskOne(prompt, &choiceStr, nil)
	choice := stringMap[choiceStr]
	return choice
}

type rpInfo struct {
	Title string `json:"title"`
	RPID  string `json:"rpid"`
}

func (r *rpInfo) String() string {
	return fmt.Sprintf("%s [%s]", r.Title, r.RPID)
}

func getRpList() ([]rpInfo, error) {
	res, err := http.Get("http://127.0.0.1:12789/rps")
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var rps []rpInfo
	err = json.NewDecoder(res.Body).Decode(&rps)
	if err != nil {
		return nil, err
	}
	return rps, nil
}
