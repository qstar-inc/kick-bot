import mysql from "mysql2/promise";
import { postErrors } from "./utils_functions.js";

var pool = mysql.createPool({
  connectionLimit: 10,
  connectTimeout: 60 * 60 * 1000,
  // acquireTimeout: 60 * 60 * 1000,
  // timeout: 60 * 60 * 1000,
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  database: process.env.MYSQL_DB,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PWD,
  supportBigNumbers: true,
  bigNumberStrings: true,
  charset: "utf8mb4_unicode_ci",
});

// function getPool() {
//   if (!pool) {
//     pool.getConnection(async (err, connection) => {
//       if (err) {
//         await postErrors("Error connecting to the database:", err);
//         return;
//       }
//       if (connection) connection.release();
//       console.log("Connected to the MySQL database.");
//     });
//   }
//   return pool;
// }

// const query = (sql, params) => {
//   return new Promise((resolve, reject) => {
//     pool.query(sql, params, (error, results) => {
//       if (error) return reject(error);
//       resolve(results);
//     });
//   });
// };

export const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log("Connected to MySQL database.");
    conn.release();
  } catch (error) {
    await postErrors("Database connection failed:", error);
    throw error;
  }
};

export const getChannelMonitor = async () => {
  try {
    const [rows] = await pool.query("SELECT * FROM monitor_channels");
    return rows;
  } catch (error) {
    await postErrors("Error getting monitor_channels:", error);
    throw error;
  }
};

export const getChannelMonitorServer = async server => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM monitor_channels WHERE server = ?",
      [server],
    );
    return rows[0];
  } catch (error) {
    await postErrors("Error getting monitor_channels:", error);
    throw error;
  }
};

export const addChannelMonitor = async (server, monitor, report) => {
  try {
    const [result] = await pool.query(
      "INSERT INTO monitor_channels (server, monitor, report) VALUES (?, ?, ?)",
      [BigInt(server), BigInt(monitor), BigInt(report)],
    );
    return result.insertId;
  } catch (error) {
    await postErrors("Error adding to monitor_channels:", error);
    throw error;
  }
};

export default pool;
