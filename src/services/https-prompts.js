const inquirer = require('inquirer');

module.exports = async function askAboutHttps() {
    return inquirer.prompt([
        {
            type: 'confirm',
            name: 'useHttps',
            default: false,
            message:
`Use HTTPS on this server?

If you are hosting this server on your home computer (and it is
therefore probably not reachable through the public Internet) then
HTTPS will not work, so you should not use it.

However, if your server is hosted in the cloud (or is otherwise
available on the public Internet) then it is highly recommended to
use HTTPS to keep this server secure. This requires that your server
has a domain name!

So, will you use HTTPS?`

        },
        {
            type: 'confirm',
            name: 'leTos',
            when: ({ useHttps }) => useHttps,
            default: false,
            message:
`RPNow uses Let's Encrypt to obtain HTTPS certificates. Accept the
Let's Encrypt terms of service?

https://letsencrypt.org/repository/`
        },
        {
            type: 'input',
            name: 'email',
            when: ({ useHttps, leTos }) => useHttps && leTos,
            validate: value => !!value.match(/^[a-z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*$/) || 'Please enter a valid e-mail address.',
            message:
`Please provide an e-mail address to register to Let's Encrypt.
This will not be used by RPNow.`
        },
        {
            type: 'input',
            name: 'domain',
            when: ({ useHttps, leTos }) => useHttps && leTos,
            validate: value => !!value.match(/^(?:[a-z0-9-]+\.)*[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.[a-z]{2,}$/) || 'Please enter a valid domain name.',
            message:
`Finally, enter the domain name that this server is hosted on.`
        },
    ])
};
