import { RowDataPacket } from "mysql2";

export type MonitorChannelRow = RowDataPacket & {
  id: number;
  server: string;
  monitor: string;
  report: string;
};

export type SpamUserRow = RowDataPacket & {
  id: number;
  server: string;
  user: string;
  message?: string;
  messageTime?: string;
  processed: number;
};
