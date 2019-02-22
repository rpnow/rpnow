const os = require('os');

const myIpAddresses = Object.values(os.networkInterfaces())
    .map(x => x.find(({ family, internal }) => family === 'IPv4' && !internal))
    .filter(x => x)
    .map(x => x.address);

const banner = ({ port, ssl, sslPort, sslDomain, dataDir }) => `
 _ __ _ __  _ __   _____      __
| '__| '_ \\| '_ \\ / _ \\ \\ /\\ / /
| |  | |_) | | | | (_) \\ V  V /
|_|  | .__/|_| |_|\\___/ \\_/\\_/
     |_|         pre-alpha test

${(sslDomain) ? (
`To access this RPNow server, try visiting the following in your
web browser:

* ${ssl ? 'https://' : 'http://'}${sslDomain}`
):(
`${(process.platform === 'win32') ? (
`To access RPNow on the local network, (i.e., when connected to the
same wi-fi as this computer) try visiting one of the following in your
web browser:

${(myIpAddresses.length > 0) ? (
myIpAddresses.map(ip => {
    if (ssl) return sslPort === 443 ? `* https://${ip}` : `* https://${ip}:${sslPort}`;
    else return port === 80 ? `* http://${ip}` : `* http://${ip}:${port}`
}).join('\n')
):(
`  (Unable to determine my address.)`
)}`
):(
''
)}`
)}

RP data will be stored in ${dataDir}

Have fun!
`;

module.exports = banner;
