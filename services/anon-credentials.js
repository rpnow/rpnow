const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const ExpressJwt = require('express-jwt');
const cuid = require('cuid');

const filename = '.data/secret';

function generateSecret() {
  console.info('generating new secret');
  const jwtSecret = crypto.randomBytes(256/8)
  fs.writeFileSync(filename, jwtSecret, 'binary');
  return jwtSecret;
}

const jwtSecret = (fs.existsSync(filename))
  ? fs.readFileSync(filename)
  : generateSecret();

module.exports = {
  generateAnonCredentials() {
    const userid = 'anon:' + cuid();
    const token = jwt.sign({ userid }, jwtSecret);
    return { userid, token };
  },

  // TODO xsrf ? not sure where to do that
  
  authMiddleware: ExpressJwt({
    secret: jwtSecret,
    getToken(req) {
      return req.cookies.usertoken || null;
    },
  }),
};
