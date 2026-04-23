import { readFileSync } from "fs";

const pkg = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
);

export const botText = {
  name: `Kick Bot`,
  version: pkg.version,
  starq_id: `284951496586559488`,
  kick_bot_id: `1395095506639913031`,
  test_bot_id: `1495066693431591113`,
};
