const https = require('https');
const url = require('url');
const DB = require('./database');

function httpsPost(urlString, bodyObj) {
  return new Promise((resolve, reject) => {
    const bodyString = JSON.stringify(bodyObj);
    const req = https.request(
      {
        ...url.parse(urlString),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': bodyString.length
        }
      },
    );
    req.on('response', response => {
      if (response.statusCode >= 200 && response.statusCode <= 299) resolve();
      else reject();
    })
    req.write(bodyString);
    req.end();
  });
}

module.exports = {
  async test(webhook) {
    const reply = await httpsPost(webhook, {"content":"Webhook test successful"})
  },
  async send(title, msg) {
    const embed = {
      footer: {
        text: title
      },
      url: `https://${process.env.PROJECT_DOMAIN}.glitch.me`,
    }

    if (msg.type === 'image') {
      embed.title = 'New image post';
    } else {
      let bodyText = '';
      if (msg.type === 'chara') {
        const chara = await DB.getDoc('charas', msg.charaId)
        bodyText += chara.name + ': ';
        embed.color = parseInt(chara.color.slice(1), 16);
      } else if (msg.type === "narrator") {
        bodyText += "Narrator: "
      } else if (msg.type === "ooc") {
        bodyText += "OOC: "
      }
      if (msg.content.length > 20) {
        bodyText += msg.content.slice(0, 20) + "..."
      } else {
        bodyText += msg.content;
      }
      embed.title = bodyText
    }

    const body = { embeds: [embed] };

    for (const { webhook } of await DB.getDocs('webhooks').asArray()) {
      httpsPost(webhook, body);
    }
  }
}
