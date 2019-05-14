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

	install_dir=$(dirname $0)

	if ! [ $(id -u) = 0 ]; then
		sudo_cmd="sudo"
	else
		sudo_cmd=""
	fi

	# TODO Back up existing rpnow, if any found in path
	# if rpnow_path="$(type -p "rpnow")"; then
	# 	rpnow_backup="${rpnow_path}_old"
	# 	echo "Backing up $rpnow_path to $rpnow_backup"
	# 	echo "(Password may be required.)"
	# 	sudo mv "$rpnow_path" "$rpnow_backup"
	# fi
	echo "Removing old rpnow server"
	$sudo_cmd rm -rf "/usr/local/rpnow"
	$sudo_cmd rm "/usr/local/bin/rpadmin"

	echo "Installing rpnow to /usr/local/bin (may require password)"
	$sudo_cmd mv "$install_dir/rpnow" "/usr/local/bin/"
	$sudo_cmd chmod +x "/usr/local/bin/rpnow"

	# Put /etc/rpnow.ini if not exists
	if [ ! -f /etc/rpnow.ini ]; then
		echo "Putting default /etc/rpnow.ini file (may require password)"
		$sudo_cmd bash -c 'cat > /etc/rpnow.ini << EOF
; Turn SSL (HTTPS) on or off.
ssl=false
; SSL requires a domain name. Enter the domain name that points to your server.
; Example: sslDomain=rpnow.net
sslDomain=

; SSL certificates are generated automatically by letsencrypt.org
; By changing this from "false" to "true", you accept their
; terms of service, which can currently be found at:
; https://letsencrypt.org/documents/LE-SA-v1.2-November-15-2017.pdf
letsencryptAcceptTOS=false
EOF'
	else
		echo "/etc/rpnow.ini already exists, skipping"
	fi

	echo "Creating RPNow system user"
	$sudo_cmd useradd --system --shell /bin/false rpnow || true
	# setgid for rpnow server, so it has access to its special directories
	$sudo_cmd chown rpnow:rpnow /usr/local/bin/rpnow
	$sudo_cmd chmod g+s /usr/local/bin/rpnow

	echo "Adding network capabilities for rpnow program"
	if setcap_cmd=$(PATH+=$PATH:/sbin type -p setcap); then
		$sudo_cmd $setcap_cmd cap_net_bind_service=+ep "/usr/local/bin/rpnow"
	else
		echo ""
		echo "***WARNING: setcap not installed!***"
		echo "Permission errors may occur when running RPNow with default settings!"
		echo "Try running the following command to install setcap, then re-run this installer."
		echo ""
		echo "  sudo apt install libcap2-bin"
		echo ""
	fi

	echo "Adding empty directory for storing RPNow data"
	$sudo_cmd mkdir -p /var/local/rpnow
	$sudo_cmd chown rpnow:rpnow /var/local/rpnow
	$sudo_cmd chmod 775 /var/local/rpnow

	# TODO check installation
	# rpadmin --version

	echo "Successfully installed"
	trap ERR
	return 0
}

install_rpnow "$@"
