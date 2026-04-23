import mysql, { RowDataPacket } from "mysql2/promise";

import { requireEnv } from "../helpers/env.js";

let logger: { error: Function } | null = null;

export function setLogger(l: typeof logger) {
  logger = l;
}

var pool = mysql.createPool({
  connectionLimit: 10,
  connectTimeout: 60 * 60 * 1000,
  // acquireTimeout: 60 * 60 * 1000,
  // timeout: 60 * 60 * 1000,

  host: requireEnv("MYSQL_HOST"),
  port: parseInt(requireEnv("MYSQL_PORT")),
  database: requireEnv("MYSQL_DB"),
  user: requireEnv("MYSQL_USER"),
  password: requireEnv("MYSQL_PWD"),

  supportBigNumbers: true,
  bigNumberStrings: true,
  charset: "utf8mb4_unicode_ci",
});

export const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log("Connected to MySQL database.");
    conn.release();
  } catch (error) {
    logger?.error(error, "Database connection failed");
  }
};

export async function queryRows<T extends RowDataPacket>(
  sql: string,
  params?: any[],
): Promise<T[]> {
  const [rows] = await pool.query<T[]>(sql, params);
  return rows;
}

export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params?: any[],
): Promise<T | null> {
  const [rows] = await pool.query<T[]>(sql, params);
  return rows[0] ?? null;
}

export default pool;
