package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/manifoldco/promptui"
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
		rp, err := pickRp(rps)
		if err != nil {
			panic(err)
		}
		urls, err := getRpUrls(rp.RPID)
		if err != nil {
			panic(err)
		}
		fmt.Println(urls)
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

func pickRp(rps []rpInfo) (*rpInfo, error) {
	strings := make([]string, len(rps))
	for i, v := range rps {
		str := v.String()
		strings[i] = str
	}

	prompt := promptui.Select{
		Label: "Choose an RP:",
		Items: strings,
	}

	idx, _, err := prompt.Run()
	if err != nil {
		return nil, err
	}

	return &rps[idx], nil
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

type rpURL struct {
	URL    string `json:"url"`
	Access string `json:"access"`
}

func getRpUrls(rpid string) ([]rpURL, error) {
	res, err := http.Get(fmt.Sprintf("http://127.0.0.1:12789/rps/%s", rpid))
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var urls []rpURL
	err = json.NewDecoder(res.Body).Decode(&urls)
	if err != nil {
		return nil, err
	}
	return urls, nil
}
