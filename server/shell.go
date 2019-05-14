package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/manifoldco/promptui"
)

func runShell() {
	fmt.Println("RPNow Admin Console")

	for {
		fmt.Println()
		fmt.Print("server status... ")
		up, pid, err := isServerUp()
		if !up {
			fmt.Println("(server not running)")
		} else if err != nil {
			fmt.Println(err)
		} else {
			fmt.Println("ok")
		}

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
			startServer()
		case "test server":
			testServer()
		case "stop server":
			stopServer(pid)
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

func startServer() {
	cmdFile, err := os.Executable()
	if err != nil {
		panic(err)
	}
	cmd := exec.Command(cmdFile, "server")

	if err := cmd.Start(); err != nil {
		fmt.Printf("Error starting server: %s\n", err)
	}

	exited := make(chan error)

	go func() {
		exited <- cmd.Wait()
	}()

	for i := 0; i < 10; i++ {
		select {
		case err := <-exited:
			if err != nil {
				fmt.Printf("Server exited! %s\n", err)
			} else {
				fmt.Println("Server exited cleanly!")
			}
			return
		default:
			if rpnowStatus, _, err := isServerUp(); rpnowStatus {
				fmt.Println("Server ready")
				return
			} else if err != nil {
				fmt.Printf("Server error: %s\n", err)
			}
			time.Sleep(time.Duration(250) * time.Millisecond)
		}
	}
	fmt.Println("Server not responding?")
}

func testServer() {
	fmt.Printf("########################\n TESTING RPNOW SERVER\n (Press CTRL+C to stop)\n########################\n")
	cmdFile, err := os.Executable()
	if err != nil {
		panic(err)
	}
	cmd := exec.Command(cmdFile, "server")

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
}

func stopServer(pid int) {
	prompt := promptui.Prompt{
		Label:     "Stop RPNow server?",
		IsConfirm: true,
	}
	_, err := prompt.Run()

	if err != nil {
		return
	}

	process, err := os.FindProcess(pid)
	if err != nil {
		fmt.Printf("Error finding process with pid %d: %s\n", pid, err)
		return
	}
	err = process.Kill()
	if err != nil {
		fmt.Printf("Error killing server process: %s\n", err)
		return
	}
	fmt.Println("Server stopped")
}

func createRp() {
	prompt := promptui.Prompt{Label: "Enter a title for this RP (leave blank to cancel)"}
	title, err := prompt.Run()
	if err != nil {
		return
	}
	if len(title) == 0 {
		return
	}
	rpCode, err := apiCreateRp(title)
	if err != nil {
		panic(err)
	}
	fmt.Printf("RP Created: /rp/%s\n", rpCode)
}

func editRps() {
	for {
		// Select an RP from the list
		rps, err := apiGetRpList()
		if err != nil {
			panic(err)
		}

		rp := pickRp(rps)
		if rp == nil {
			return
		}
		editRp(rp)
	}
}

func editRp(rp *RoomInfo) {
	for {
		// Expand & edit the selected RP
		urls, err := apiGetRpUrls(rp.RPID)
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
			confirmDestroyRp(rp)
			return
		}
	}
}

func confirmDestroyRp(rp *RoomInfo) bool {
	killswitch := strings.ToUpper(fmt.Sprintf("destroy %s", rp.Title))
	prompt := promptui.Prompt{Label: fmt.Sprintf("Type %q", killswitch)}
	result, _ := prompt.Run()
	if result != killswitch {
		fmt.Println("Incorrect. Will not delete.")
		return false
	}

	err := apiDestroyRp(rp.RPID)
	if err != nil {
		panic(err)
	}
	fmt.Printf("BOOM! %q is no more.\n", rp.Title)
	return true
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

func editRpUrls(rp *RoomInfo) {
	for {
		urls, err := apiGetRpUrls(rp.RPID)
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
			err = apiPutURL(rp.RPID, urlAction.rpURL)
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
				err = apiDeactivateURL(urlAction.rpURL)
				if err != nil {
					panic(err)
				}
				fmt.Printf("Deactivated URL: %q\n", urlAction.rpURL.String())
			}
		}
	}
}

func isServerUp() (bool, int, error) {

	res, err := http.Get("http://127.0.0.1:12789/status")
	if err != nil {
		return false, 0, nil
	}
	defer res.Body.Close()
	var status struct {
		RPNowLine string `json:"rpnow"`
		PID       int    `json:"pid"`
	}
	err = json.NewDecoder(res.Body).Decode(&status)
	if err != nil {
		return false, 0, errors.New("Bad response from admin API")
	}
	return status.RPNowLine == "ok", status.PID, nil
}

func pickRp(rpsListWithoutBackOption []*RoomInfo) *RoomInfo {
	fmt.Println()
	rps := append([]*RoomInfo{nil}, rpsListWithoutBackOption...)

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

func pickUser(usersListWithoutBackOption []*User) *User {
	fmt.Println()
	users := append([]*User{nil}, usersListWithoutBackOption...)

	prompt := promptui.Select{
		Label: "Choose a user",
		Items: users,
		Searcher: func(input string, index int) bool {
			return strings.Contains(strings.ToLower(users[index].Username), strings.ToLower(input))
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
		users, err := apiGetUserList()
		if err != nil {
			panic(err)
		}

		user := pickUser(users)
		if user == nil {
			return
		}
		editUser(user)
	}
}

func editUser(user *User) {
	prompt := promptui.Select{
		Label: fmt.Sprintf("Modify user: %s", user.Username),
		Items: []string{"go back", "change permissions", "delete user"},
	}
	_, action, err := prompt.Run()
	if err != nil {
		panic(err)
	}
	if action == "go back" {
		return
	} else if action == "change permissions" {
		editUserPermissions(user)
	} else if action == "delete user" {
		confirmDeleteUser(user)
	}
}

func confirmDeleteUser(user *User) bool {
	killswitch := strings.ToUpper(fmt.Sprintf("delete %s", user.Username))
	prompt := promptui.Prompt{Label: fmt.Sprintf("Type %q", killswitch)}
	result, _ := prompt.Run()
	if result != killswitch {
		fmt.Println("Incorrect. Will not delete.")
		return false
	}

	err := apiDeleteUser(user.Username)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Goodbye! User %q is no more.\n", user.Username)
	return true
}

func editUserPermissions(user *User) {
	if user.CanCreate {
		fmt.Println(user.Username + " is currently ALLOWED to create new RPs.")
	} else {
		fmt.Println(user.Username + " is currently UNABLE to create new RPs.")
	}

	prompt := promptui.Prompt{
		Label:     "Change this setting?",
		IsConfirm: true,
	}
	_, err := prompt.Run()

	if err != nil {
		fmt.Println("Permissions not changed")
		return
	}

	if err := apiPostUserCreatorSetting(user.Username, !user.CanCreate); err != nil {
		panic(err)
	}

	fmt.Println("User settings changed")
}

func securityMenu() {
	policy, err := apiGetSecurityPolicy()
	if err != nil {
		panic(err)
	}
	fmt.Println("Current security policy:")
	printPolicyDetails(policy)
	fmt.Println()
	prompt := promptui.Prompt{
		Label:     "Change this policy?",
		IsConfirm: true,
	}
	_, err = prompt.Run()

	if err != nil {
		return
	}

	fmt.Println("")
	fmt.Println("Restrict creating new RPs?")
	fmt.Println("")
	fmt.Println("Restricting is the safer option. It means that you must")
	fmt.Println("individually grant users permission to create a new RP.")
	fmt.Println("")
	fmt.Println("By allowing anyone to create an RP, you expose your server")
	fmt.Println("to spam, and to being used without your consent.")
	fmt.Println("")

	choice := promptui.Select{
		Label: "Choose RP creation policy",
		Items: []string{
			"Restrict RP creation",
			"Allow any visitor to create an RP (dangerous!)",
		},
	}
	idx, _, err := choice.Run()
	if err != nil {
		return
	}
	policy.RestrictCreate = (idx == 0)

	fmt.Println("")
	fmt.Println("Choose the user registration quota.")
	fmt.Println("")
	fmt.Println("This is the maximum number of users who can be registered")
	fmt.Println("on your site. It prevents spam registrations from cluttering")
	fmt.Println("your list of users.")
	fmt.Println("")
	fmt.Println("If you don't anticipate any new users joining your server,")
	fmt.Println("you may set this to 0. It will not delete any existing users.")
	fmt.Println("")

	prompt = promptui.Prompt{
		Label: "Enter the max number of registered users",
		Validate: func(input string) error {
			num, err := strconv.Atoi(input)
			if err != nil {
				return errors.New("Invalid number")
			}
			if num < 0 {
				return errors.New("Must be >= 0")
			}
			return nil
		},
		Default: strconv.Itoa(policy.UserQuota),
	}
	quota, err := prompt.Run()
	if err != nil {
		return
	}
	policy.UserQuota, _ = strconv.Atoi(quota)

	fmt.Println("New policy:")
	printPolicyDetails(policy)
	fmt.Println("")

	prompt = promptui.Prompt{
		Label:     "Is this correct?",
		IsConfirm: true,
	}
	_, err = prompt.Run()

	if err != nil {
		fmt.Println("Policy not changed")
		return
	}

	if err := apiPutSecurityPolicy(*policy); err != nil {
		panic(err)
	}

	fmt.Println("Security policy has been updated successfully")
}

func printPolicyDetails(policy *SecurityPolicy) {
	if policy.RestrictCreate {
		fmt.Println("  Creating RPs: RESTRICTED")
	} else {
		fmt.Println("  Creating RPs: UNRESTRICTED")
	}
	fmt.Printf("  Registered user quota: %d\n", policy.UserQuota)
}

func (r *RoomInfo) String() string {
	if r == nil {
		return "(main menu)"
	}
	return fmt.Sprintf("%-30s (%s)", r.Title, r.CreatedAt.Format("02 Jan 2006"))
}

func (u *User) String() string {
	if u == nil {
		return "(main menu)"
	}
	if u.CanCreate {
		return "User [RP Creator]: " + u.Username
	}
	return "User: " + u.Username
}

func apiGetRpList() ([]*RoomInfo, error) {
	res, err := http.Get("http://127.0.0.1:12789/rps")
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var rps []*RoomInfo
	err = json.NewDecoder(res.Body).Decode(&rps)
	if err != nil {
		return nil, err
	}
	return rps, nil
}

func apiGetUserList() ([]*User, error) {
	res, err := http.Get("http://127.0.0.1:12789/users")
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var users []*User
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

func apiGetRpUrls(rpid string) ([]rpURL, error) {
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

func apiPutURL(rpid string, url rpURL) error {
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

func apiDeactivateURL(url rpURL) error {
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

func apiDestroyRp(rpid string) error {
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

func apiCreateRp(title string) (string, error) {
	reqBody := map[string]string{"title": title}
	reqBodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		panic(err)
	}
	req, err := http.NewRequest("POST", "http://127.0.0.1:12789/rp", bytes.NewBuffer(reqBodyJSON))
	req.Header.Set("Content-Type", "application/json")
	if err != nil {
		return "", err
	}
	var client http.Client
	res, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	out := make(map[string]string)
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return "", err
	}

	return out["rpCode"], nil
}

func apiGetSecurityPolicy() (*SecurityPolicy, error) {
	res, err := http.Get("http://127.0.0.1:12789/security")
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var policy SecurityPolicy
	err = json.NewDecoder(res.Body).Decode(&policy)
	if err != nil {
		return nil, err
	}
	return &policy, nil
}

func apiPutSecurityPolicy(policy SecurityPolicy) error {
	reqBodyJSON, err := json.Marshal(&policy)
	if err != nil {
		panic(err)
	}
	req, err := http.NewRequest("PUT", "http://127.0.0.1:12789/security", bytes.NewBuffer(reqBodyJSON))
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

func apiPostUserCreatorSetting(username string, canCreate bool) error {
	reqBodyJSON, err := json.Marshal(&canCreate)
	if err != nil {
		panic(err)
	}
	req, err := http.NewRequest("POST", "http://127.0.0.1:12789/users/"+username+"/creator", bytes.NewBuffer(reqBodyJSON))
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

func apiDeleteUser(username string) error {
	req, err := http.NewRequest("DELETE", "http://127.0.0.1:12789/users/"+username, nil)
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
