#!/usr/bin/env bash
#
#                  RPNow Installer Script
#
# This script safely installs RPNow into your PATH (which may require
# password authorization). Use it like this:
#
#	$ curl https://raw.githubusercontent.com/rpnow/rpnow/master/install.sh | bash
#

[[ $- = *i* ]] && echo "Don't source this script!" && return 10

install_rpnow()
{
	trap 'echo -e "Aborted, error $? in command: $BASH_COMMAND"; trap ERR; exit 1' ERR

	rpnow_os="unsupported"
	rpnow_arch="unknown"

	#########################
	# Which OS and version? #
	#########################

	rpnow_version="2.2-alpha9"
	rpnow_dl_ext=".tar.gz"

	# NOTE: `uname -m` is more accurate and universal than `arch`
	# See https://en.wikipedia.org/wiki/Uname
	unamem="$(uname -m)"
	if [[ $unamem == *64* ]]; then
		rpnow_arch="amd64"
	else
		echo "Aborted, unsupported or unknown architecture: $unamem"
		return 2
	fi

	unameu="$(tr '[:lower:]' '[:upper:]' <<<$(uname))"
	if [[ $unameu == *LINUX* ]]; then
		rpnow_os="linux"
	else
		echo "Aborted, unsupported or unknown os: $uname"
		return 6
	fi

	########################
	# Download and extract #
	########################

	echo "Downloading RPNow for ${rpnow_os}/${rpnow_arch}..."
	rpnow_file="rpnow-${rpnow_os}-${rpnow_version}${rpnow_dl_ext}"
	rpnow_url="https://github.com/rpnow/rpnow/releases/download/${rpnow_version}/rpnow-${rpnow_os}${rpnow_dl_ext}"
	rpadmin_url="https://github.com/rpnow/rpnow/releases/download/${rpnow_version}/rpadmin"

	dl="/tmp/$rpnow_file"
	dladmin="/tmp/rpadmin"
	rm -rf -- "$dl"

	if type -p curl >/dev/null 2>&1; then
		curl -fsSL "$rpnow_url" -o "$dl"
		curl -fsSL "$rpadmin_url" -o "$dladmin"
	elif type -p wget >/dev/null 2>&1; then
		wget --quiet "$rpnow_url" -O "$dl"
		wget --quiet "$rpadmin_url" -O "$dladmin"
	else
		echo "Aborted, could not find curl or wget"
		return 7
	fi

	echo "Extracting..."

	dl_unzip="/tmp/rpnow-${rpnow_os}-${rpnow_version}/"
	rm -rf -- "$dl_unzip"
	mkdir "$dl_unzip"

	case "$rpnow_file" in
		*.zip)    unzip -q "$dl" -d "$dl_unzip" ;;
		*.tar.gz) tar -xzf "$dl" -C "$dl_unzip" ;;
	esac
	chmod +x "$dl_unzip/rpnow"

	# TODO Back up existing rpnow, if any found in path
	# if rpnow_path="$(type -p "rpnow")"; then
	# 	rpnow_backup="${rpnow_path}_old"
	# 	echo "Backing up $rpnow_path to $rpnow_backup"
	# 	echo "(Password may be required.)"
	# 	sudo mv "$rpnow_path" "$rpnow_backup"
	# fi
	sudo rm -rf "/usr/local/rpnow"

	echo "Putting rpnow files in /usr/local/rpnow (may require password)"
	sudo mv "$dl_unzip" "/usr/local/rpnow"
	if setcap_cmd=$(PATH+=$PATH:/sbin type -p setcap); then
		sudo $setcap_cmd cap_net_bind_service=+ep "/usr/local/rpnow/rpnow"
	else
		echo ""
		echo "***WARNING: setcap not installed!***"
		echo "Permission errors may occur when running RPNow with default settings!"
		echo "Try running the following command to install setcap, then re-run this installer."
		echo ""
		echo "  sudo apt install libcap2-bin"
		echo ""
	fi
	sudo rm -- "$dl"

	# Put /etc/rpnow.ini if not exists
	if [ ! -f /etc/rpnow.ini ]; then
		echo "Putting default /etc/rpnow.ini file (may require password)"
		sudo bash -c 'cat > /etc/rpnow.ini << EOF
; Turn SSL (HTTPS) on or off.
ssl=false
; SSL requires a domain name. Enter the domain name that points to your server.
; Example: sslDomain=rpnow.net
sslDomain=

; SSL certificates are generated automatically by letsencrypt.org
; By changing this from 'false' to 'true', you accept their
; terms of service, which can currently be found at:
; https://letsencrypt.org/documents/LE-SA-v1.2-November-15-2017.pdf
letsencryptAcceptTOS=false

; You must also provide an e-mail address to use letsencrypt
letsencryptEmail=
EOF'
	else
		echo "/etc/rpnow.ini already exists, skipping"
	fi

	echo "Putting rpadmin command in /usr/local/bin (may require password)"
	sudo mv "$dladmin" /usr/local/bin/
	sudo chmod +x /usr/local/bin/rpadmin

	# TODO check installation
	# rpadmin --version

	echo "Creating RPNow system user"
	sudo useradd --system --shell /bin/false rpnow || true
	# setgid for rpnow server, so it has access to its special directories
	sudo chown rpnow:rpnow /usr/local/rpnow/rpnow
	sudo chmod g+s /usr/local/rpnow/rpnow

	echo "Adding empty directory for storing RPNow data"
	sudo mkdir -p /var/local/rpnow
	sudo chown rpnow:rpnow /var/local/rpnow

	echo "Successfully installed"
	trap ERR
	return 0
}

install_rpnow "$@"
