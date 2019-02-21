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

	rpnow_version="2.2-alpha7"
	rpnow_dl_ext=".zip"

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
	rpnow_url="https://github.com/rpnow/rpnow/releases/download/${rpnow_version}/rpnow-${rpnow_os}.zip"

	dl="/tmp/$rpnow_file"
	rm -rf -- "$dl"

	if type -p curl >/dev/null 2>&1; then
		curl -fsSL "$rpnow_url" -o "$dl"
	elif type -p wget >/dev/null 2>&1; then
		wget --quiet "$rpnow_url" -O "$dl"
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
		# *.tar.gz) tar -xzf "$dl" -C "/tmp/" "$rpnow_bin" ;;
	esac
	chmod +x "$dl_unzip/rpnow"

	# TODO Back up existing rpnow, if any found in path
	# if rpnow_path="$(type -p "rpnow")"; then
	# 	rpnow_backup="${rpnow_path}_old"
	# 	echo "Backing up $rpnow_path to $rpnow_backup"
	# 	echo "(Password may be required.)"
	# 	sudo mv "$rpnow_path" "$rpnow_backup"
	# fi
	sudo rm -rf "/opt/rpnow"

	echo "Putting rpnow files in /opt/rpnow (may require password)"
	sudo mv "$dl_unzip" "/opt/rpnow"
	if setcap_cmd=$(PATH+=$PATH:/sbin type -p setcap); then
		sudo $setcap_cmd cap_net_bind_service=+ep "/opt/rpnow/rpnow"
	fi
	sudo rm -- "$dl"

	echo "Putting rpnow command in /usr/local/bin (may require password)"
	sudo bash -c 'cat > /usr/local/bin/rpnow << EOF
#!/bin/sh
cd /opt/rpnow
./rpnow "\$@"
EOF'
	sudo chmod +x /usr/local/bin/rpnow

	# TODO check installation
	# rpnow --version

	echo "Successfully installed"
	trap ERR
	return 0
}

install_rpnow "$@"
