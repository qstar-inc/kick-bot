import { ResultSetHeader } from "mysql2";

import { isDev } from "../index.js";
import { SpamUserRow } from "../types/db.js";
import pool, { queryOne, queryRows } from "./main.js";

const tableName = isDev ? "spammers_dev" : "spammers";

export const getSpammersToProcess = () =>
  queryRows<SpamUserRow>(`SELECT * FROM ${tableName} WHERE processed = 0`);

export const getAllSpamUsersFromThisServer = (server: string) =>
  queryOne<SpamUserRow>(
    `SELECT server, user FROM ${tableName} WHERE server = ?`,
    [server],
  );

export async function insertSpamUser(
  server: string,
  user: string,
  message: string,
  time: bigint,
): Promise<number> {
  console.log(`Inserting Spam User ${server}, ${user}, ${message}, ${time}`);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO ${tableName} (server, user, message, message_time)
     VALUES (?, ?, ?, ?)`,
    [server, user, message, time],
  );
  // return 0;
  return result.insertId;
}

export async function markProcessed(id: number) {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE ${tableName} SET processed = 1 WHERE (id = ?)
     VALUES (?)`,
    [id],
  );
  return result;
}
