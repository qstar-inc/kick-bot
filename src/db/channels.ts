import { ResultSetHeader } from "mysql2";

import { isDev } from "../index.js";
import { MonitorChannelRow } from "../types/db.js";
import pool, { queryRows } from "./main.js";

const tableName = isDev ? "channels_dev" : "channels";

export const monitorByChannel = new Map<string, MonitorChannelRow>();
export const monitorByGuild = new Map<string, MonitorChannelRow>();

export async function reloadChannels() {
  const channels = await getAllMonitorChannels();

  monitorByChannel.clear();
  monitorByGuild.clear();

  for (const c of channels) {
    monitorByChannel.set(c.monitor, c);
    monitorByGuild.set(c.server, c);
  }
}

const getAllMonitorChannels = () =>
  queryRows<MonitorChannelRow>(`SELECT * FROM ${tableName}`);

export async function upsertMonitorChannel(
  server: string,
  monitor: string,
  report: string,
): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO ${tableName} (server, monitor, report)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       monitor = VALUES(monitor),
       report = VALUES(report)`,
    [server, monitor, report],
  );

  return result.insertId;
}
