const { monitorSpamAcrossChannels } = require("./utils_functions");
const db = require("./db");
const { botText } = require("./botText");
const { postErrors } = require("./utils_functions");

function startSpamScanner(client) {
  monitorSpamAcrossChannels(client, db, botText, postErrors);
  setInterval(() => {
    monitorSpamAcrossChannels(client, db, botText, postErrors);
  }, 5 * 60 * 1000); // every 5 minutes
}

module.exports = { startSpamScanner };
