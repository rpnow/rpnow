const os = require('os');

const myIpAddresses = Object.values(os.networkInterfaces())
    .map(x => x.find(({ family, internal }) => family === 'IPv4' && !internal))
    .filter(x => x)
    .map(x => x.address);

const banner = ({ https, httpPort, httpsPort, domain }) => `
 _ __ _ __  _ __   _____      __
| '__| '_ \\| '_ \\ / _ \\ \\ /\\ / /
| |  | |_) | | | | (_) \\ V  V /
|_|  | .__/|_| |_|\\___/ \\_/\\_/
     |_|         pre-alpha test

Your RPNow server is ready!

${(domain) ? (
`To access this RPNow server, try visiting the following in your
web browser:

* ${https ? 'https://' : 'http://'}${domain}:${httpsPort}`
):(
`${(process.platform === 'win32') ? (
`To access RPNow on the local network, (i.e., when connected to the
same wi-fi as this computer) try visiting one of the following in your
web browser:`
):(
`To access this RPNow server, try visiting one of the following in your
web browser:`
)}

${(myIpAddresses.length > 0) ? (
myIpAddresses.map(ip => httpPort === 80 ? `* http://${ip}` : `* http://${ip}:${httpPort}`).join('\n')
):(
`  (Unable to determine my address.)`
)}`)}

Have fun!
`;

module.exports = banner;
