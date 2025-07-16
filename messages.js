const { userMention } = require("discord.js");
const { botText } = require("./botText");

const messages = {
  critical: `## CRITICAL ERROR: Command Execution Failed!\n### Houston, we have a problem! Something went wrong while executing commands. It looks like the teleportation matrix encountered an unexpected issue.\nDouble-check your command syntax, maybe sacrifice a cookie to the debugging gods and then report it [here](<https://discord.com/channels/1024242828114673724/1334056201016840192>).`,
  idk: `I don't know what's happening... Maybe try again?`,
  not_cached: (modId) =>
    `## ERROR: Mod Not Cached!\n### Your attempt to summon the mod ${modId} failed! The mod isn't in our cache. Please use the \`/mod id\` command to cache it before trying again.\nRemember, even a mighty warrior needs their trusty sword at hand before charging into battle.`,
  unauthorized: `## ERROR 401: Unauthorized Request Cancelled!!\n### You do not have the necessary permissions to engage the hyperdrive. Only ${userMention(
    botText.starq_id
  )} can navigate this galaxy. May the 401 be with you!\nTry hacking a Tribble for access (Just kidding, don't do that).`,
  unauthorizedAdmin: `## ERROR 401: Unauthorized Request Cancelled!!\n### You do not have the necessary permissions to engage the hyperdrive. Only the administators can navigate this galaxy. May the 401 be with you!\nTry hacking a Tribble for access (Just kidding, don't do that).`,
  unverified: `## ERROR 401: Unauthorized Request Cancelled!!\n### You do not have the necessary permissions to engage the hyperdrive.\nTry hacking a Tribble for access (Just kidding, don't do that). Instead, get verified using the \`/register\` command.`,
};

module.exports = messages;
