package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/manifoldco/promptui"
)

func main() {
	fmt.Println("RPNow Admin Console")

	err := checkStatus()
	if err != nil {
		panic(err)
	}
	for {
		rps, err := getRpList()
		if err != nil {
			panic(err)
		}

		rp, err := pickRp(rps)
		if err != nil {
			panic(err)
		}
		urls, err := getRpUrls(rp.RPID)
		if err != nil {
			panic(err)
		}

		fmt.Println()
		fmt.Println(rp.Title)
		for _, url := range urls {
			fmt.Printf("*  %s\n", url.String())
		}

		for {
			prompt := promptui.Select{
				Label: "Action",
				Items: []string{"go back"},
			}
			_, action, err := prompt.Run()
			if err != nil {
				panic(err)
			}
			if action == "go back" {
				break
			}
		}
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
	fmt.Println()

	strings := make([]string, len(rps))
	for i, v := range rps {
		str := v.String()
		strings[i] = str
	}

	prompt := promptui.Select{
		Label: "Choose an RP",
		Items: strings,
	}
	idx, _, err := prompt.Run()
	if err != nil {
		return nil, err
	}

	return &rps[idx], nil
}

type rpInfo struct {
	Title     string    `json:"title"`
	RPID      string    `json:"rpid"`
	Timestamp time.Time `json:"timestamp"`
}

func (r *rpInfo) String() string {
	return fmt.Sprintf("%-30s (%s)", r.Title, r.Timestamp.Format("02 Jan 2006"))
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

func (u *rpURL) String() string {
	if u.Access == "normal" {
		return "/rp/" + u.URL
	} else if u.Access == "read" {
		return "/read/" + u.URL
	} else {
		return "???" + u.Access + "???"
	}
}

func getRpUrls(rpid string) ([]rpURL, error) {
	res, err := http.Get("http://127.0.0.1:12789/rps/" + rpid)
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
