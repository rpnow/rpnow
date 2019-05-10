package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/manifoldco/promptui"
)

func main() {
	fmt.Println("RPNow Admin Console")

	for {
		fmt.Println()
		up, pid := isServerUp()

		var options []string
		if up {
			options = []string{"create room", "manage rooms", "manage users", "site security", "stop server", "exit"}
		} else {
			options = []string{"start server", "test server", "exit"}
		}

		prompt := promptui.Select{
			Label: "RP Admin",
			Items: options,
			Size:  len(options),
		}
		_, action, err := prompt.Run()

		if err != nil {
			return
		}
		switch action {
		case "start server":
			cmd := exec.Command("/usr/local/rpnow/rpnow")
			cmd.Dir = "/usr/local/rpnow"

			if err := cmd.Start(); err != nil {
				fmt.Printf("Error starting server: %s\n", err)
			}

			exited := make(chan error)
			online := make(chan bool)

			go func() {
				exited <- cmd.Wait()
			}()

			go func() {
				for i := 0; i < 10; i++ {
					time.Sleep(time.Duration(250) * time.Millisecond)
					if rpnowStatus, _ := isServerUp(); rpnowStatus {
						online <- true
						return
					}
				}
				online <- false
			}()

			select {
			case err := <-exited:
				fmt.Printf("Server exited! %s\n", err)
			case isOnline := <-online:
				if isOnline {
					fmt.Println("Server ready")
				} else {
					fmt.Println("Server is running, but admin interface is not working")
				}
			}
		case "test server":
			fmt.Printf("########################\n TESTING RPNOW SERVER\n (Press CTRL+C to stop)\n########################\n")
			cmd := exec.Command("/usr/local/rpnow/rpnow")
			cmd.Dir = "/usr/local/rpnow"

			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stdout

			if err := cmd.Start(); err != nil {
				fmt.Printf("Error starting server: %s\n", err)
			}

			if err := cmd.Wait(); err != nil {
				fmt.Printf("Server exited on error: %s\n", err)
			} else {
				fmt.Println("Server exited cleanly")
			}
		case "stop server":
			prompt := promptui.Prompt{
				Label:     "Stop RPNow server?",
				IsConfirm: true,
			}
			_, err := prompt.Run()

			if err != nil {
				break
			}

			process, err := os.FindProcess(pid)
			if err != nil {
				fmt.Printf("Error finding process with pid %d: %s\n", pid, err)
				continue
			}
			err = process.Kill()
			if err != nil {
				fmt.Printf("Error killing server process: %s\n", err)
				continue
			}
			fmt.Println("Server stopped")
		case "create room":
			createRp()
		case "manage rooms":
			editRps()
		case "manage users":
			editUsers()
		case "site security":
			securityMenu()
		case "exit":
			return
		}
	}
}

func createRp() {
	prompt := promptui.Prompt{Label: "Enter a title for this RP (leave blank to cancel)"}
	title, err := prompt.Run()
	if err != nil {
		panic(err)
	}
	if len(title) == 0 {
		return
	}
	panic("not yet")
}

func editRps() {
	for {
		// Select an RP from the list
		rps, err := getRpList()
		if err != nil {
			panic(err)
		}

		rp := pickRp(rps)
		if rp == nil {
			return
		}
		for {
			// Expand & edit the selected RP
			urls, err := getRpUrls(rp.RPID)
			if err != nil {
				panic(err)
			}

			fmt.Println()
			fmt.Println(rp.Title)
			for _, url := range urls {
				fmt.Printf("*  %s\n", url.String())
			}

			prompt := promptui.Select{
				Label: fmt.Sprintf("Modify %q", rp.Title),
				Items: []string{"go back", "edit urls", "destroy rp"},
			}
			_, action, err := prompt.Run()
			if err != nil {
				panic(err)
			}
			if action == "go back" {
				break
			} else if action == "edit urls" {
				editRpUrls(rp)
			} else if action == "destroy rp" {
				killswitch := strings.ToUpper(fmt.Sprintf("destroy %s", rp.Title))
				prompt := promptui.Prompt{Label: fmt.Sprintf("Type %q", killswitch)}
				result, _ := prompt.Run()
				if result == killswitch {
					err := destroyRp(rp.RPID)
					if err != nil {
						panic(err)
					}
					fmt.Printf("BOOM! %q is no more.\n", rp.Title)
					break
				} else {
					fmt.Println("Incorrect. Will not delete.")
				}
			}
		}
	}
}

type urlEditOpt struct {
	rpURL
	Action string
}

func (x urlEditOpt) String() string {
	switch {
	case x.Action == "go back":
		return "go back"
	case x.rpURL.URL == "":
		return fmt.Sprintf("%s URL: %s", strings.Title(x.Action), x.rpURL.String()+"...")
	default:
		return fmt.Sprintf("%s URL: %s", strings.Title(x.Action), x.rpURL.String())
	}
}

func editRpUrls(rp *rpInfo) {
	for {
		urls, err := getRpUrls(rp.RPID)
		if err != nil {
			panic(err)
		}

		urlActions := make([]*urlEditOpt, 3+len(urls))
		urlActions[0] = &urlEditOpt{rpURL{}, "go back"}
		urlActions[1] = &urlEditOpt{rpURL{URL: "", Access: "normal"}, "add"}
		urlActions[2] = &urlEditOpt{rpURL{URL: "", Access: "read"}, "add"}
		for i, url := range urls {
			urlActions[3+i] = &urlEditOpt{url, "deactivate"}
		}

		prompt := promptui.Select{
			Label: "What?",
			Items: urlActions,
		}
		idx, _, err := prompt.Run()
		if err != nil {
			panic(err)
		}
		urlAction := urlActions[idx]
		switch urlAction.Action {
		case "go back":
			return
		case "add":
			prompt := promptui.Prompt{Label: "Enter a URL (a-z, 0-9, dashes) (leave blank to cancel)"}
			urlSlug, err := prompt.Run()
			if err != nil {
				panic(err)
			}
			urlAction.URL = urlSlug
			err = putURL(rp.RPID, urlAction.rpURL)
			if err != nil {
				panic(err)
			}
			fmt.Printf("Added URL:%s\n", urlAction.rpURL.String())
			break
		case "deactivate":
			prompt := promptui.Prompt{
				Label:     fmt.Sprintf("Remove URL %q", urlAction.rpURL.String()),
				IsConfirm: true,
			}
			_, err := prompt.Run()

			if err == nil {
				err = deactivateURL(urlAction.rpURL)
				if err != nil {
					panic(err)
				}
				fmt.Printf("Deactivated URL: %q\n", urlAction.rpURL.String())
			}
		}
	}
}

func isServerUp() (bool, int) {
	fmt.Print("server status... ")

	res, err := http.Get("http://127.0.0.1:12789/status")
	if err != nil {
		fmt.Println("(server not running)")
		return false, 0
	}
	defer res.Body.Close()
	var status struct {
		RPNowLine string `json:"rpnow"`
		PID       int    `json:"pid"`
	}
	err = json.NewDecoder(res.Body).Decode(&status)
	if err != nil {
		fmt.Println("(bad response)")
		return false, 0
	}
	fmt.Println(status.RPNowLine)
	return status.RPNowLine == "ok", status.PID
}

func pickRp(rpsListWithoutBackOption []*rpInfo) *rpInfo {
	fmt.Println()
	rps := append([]*rpInfo{nil}, rpsListWithoutBackOption...)

	prompt := promptui.Select{
		Label: "Choose an RP",
		Items: rps,
		Searcher: func(input string, index int) bool {
			return strings.Contains(strings.ToLower(rps[index].Title), strings.ToLower(input))
		},
	}
	idx, _, err := prompt.Run()
	if err != nil {
		return nil
	}

	return rps[idx]
}

func pickUser(usersListWithoutBackOption []*userInfo) *userInfo {
	fmt.Println()
	users := append([]*userInfo{nil}, usersListWithoutBackOption...)

	prompt := promptui.Select{
		Label: "Choose a user",
		Items: users,
		Searcher: func(input string, index int) bool {
			return strings.Contains(strings.ToLower(users[index].Userid), strings.ToLower(input))
		},
	}
	idx, _, err := prompt.Run()
	if err != nil {
		return nil
	}

	return users[idx]
}

func editUsers() {
	for {
		// Select an RP from the list
		users, err := getUserList()
		if err != nil {
			panic(err)
		}

		user := pickUser(users)
		if user == nil {
			return
		}
	}
}

func securityMenu() {
	prompt := promptui.Select{
		Label: "What?",
		Items: []string{
			"(main menu)",
			"Allow everyone to create RPs: OFF",
			"User registration quota: 100",
		},
	}
	idx, action, err := prompt.Run()
	if err != nil {
		return
	}
	_, _ = idx, action
	panic("not yet")
}

type rpInfo struct {
	Title     string    `json:"title"`
	RPID      string    `json:"rpid"`
	Timestamp time.Time `json:"createdAt"`
}

func (r *rpInfo) String() string {
	if r == nil {
		return "(main menu)"
	}
	return fmt.Sprintf("%-30s (%s)", r.Title, r.Timestamp.Format("02 Jan 2006"))
}

type userInfo struct {
	Userid string `json:"userid"`
}

func (u *userInfo) String() string {
	if u == nil {
		return "(main menu)"
	}
	return "User: " + u.Userid
}

func getRpList() ([]*rpInfo, error) {
	res, err := http.Get("http://127.0.0.1:12789/rps")
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var rps []*rpInfo
	err = json.NewDecoder(res.Body).Decode(&rps)
	if err != nil {
		return nil, err
	}
	return rps, nil
}

func getUserList() ([]*userInfo, error) {
	res, err := http.Get("http://127.0.0.1:12789/users")
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var users []*userInfo
	err = json.NewDecoder(res.Body).Decode(&users)
	if err != nil {
		return nil, err
	}
	return users, nil
}

type rpURL struct {
	URL     string `json:"slug"`
	Access  string `json:"access"`
	Deleted bool   `json:"deleted,omitempty"`
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

func putURL(rpid string, url rpURL) error {
	reqBody := struct {
		RPID   string `json:"rpid"`
		Access string `json:"access"`
	}{rpid, url.Access}
	reqBodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		panic(err)
	}
	req, err := http.NewRequest("PUT", "http://127.0.0.1:12789/url/"+url.URL, bytes.NewBuffer(reqBodyJSON))
	req.Header.Set("Content-Type", "application/json")
	if err != nil {
		return err
	}
	var client http.Client
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	return nil
}

func deactivateURL(url rpURL) error {
	req, err := http.NewRequest("DELETE", "http://127.0.0.1:12789/url/"+url.URL, nil)
	if err != nil {
		return err
	}
	var client http.Client
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	return nil
}

func destroyRp(rpid string) error {
	req, err := http.NewRequest("DELETE", "http://127.0.0.1:12789/rps/"+rpid, nil)
	if err != nil {
		return err
	}
	var client http.Client
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	return nil
}
