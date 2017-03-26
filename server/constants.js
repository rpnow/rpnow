module.exports = {
    port: 3000,
    dbHost: process.env.DB_HOST || 'localhost',

    maxTitleLength: 30,
    maxDescLength: 255,
    maxCharaNameLength: 30,
    maxMessageContentLength: 10000,

    rpCodeLength: 8,
    rpCodeChars: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
}
