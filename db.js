// const { userMention } = require("discord.js");
const { createPool } = require("mysql");
// const channelIds = require("./channelId");
// const { botText } = require("./botText");
const { postErrors } = require("./utils_functions");
require("dotenv").config();

var pool = createPool({
  connectionLimit: 10,
  connectTimeout: 60 * 60 * 1000,
  acquireTimeout: 60 * 60 * 1000,
  timeout: 60 * 60 * 1000,
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  database: process.env.MYSQL_DB,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PWD,
  supportBigNumbers: true,
  bigNumberStrings: true,
  charset: "utf8mb4_unicode_ci",
});

function getPool() {
  if (!pool) {
    pool.getConnection(async (err, connection) => {
      if (err) {
        await postErrors("Error connecting to the database:", err);
        return;
      }
      if (connection) connection.release();
      console.log("Connected to the MySQL database.");
    });
  }
  return pool;
}

const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
};

const getChannelMonitor = async () => {
  try {
    const sql = "SELECT * FROM monitor_channels";
    const results = await query(sql, []);
    return results;
  } catch (error) {
    await postErrors("Error getting monitor_channels:", error);
    throw error;
  }
};

const getChannelMonitorServer = async (server) => {
  try {
    const sql = "SELECT * FROM monitor_channels WHERE server = ?";
    const results = await query(sql, [server]);
    return results[0];
  } catch (error) {
    await postErrors("Error getting monitor_channels:", error);
    throw error;
  }
};

const addChannelMonitor = async (server, monitor, report) => {
  try {
    const sql =
      "INSERT INTO monitor_channels (server, monitor, report) VALUES (?, ?, ?)";
    const results = await query(sql, [
      BigInt(server),
      BigInt(monitor),
      BigInt(report),
    ]);
    return results.insertId;
  } catch (error) {
    await postErrors("Error adding to monitor_channels:", error);
    throw error;
  }
};

// const editQuickResponse = async (name, text) => {
//   try {
//     const sql = "UPDATE quickResponse SET text = ? WHERE name = ?";
//     const results = await query(sql, [text, name.toLowerCase()]);
//     return results.insertId;
//   } catch (error) {
//     await postErrors("Error editing quick responses:", error);
//     throw error;
//   }
// };

// const removeQuickResponse = async (name) => {
//   try {
//     const sql = "DELETE FROM quickResponse WHERE name = ?";
//     const results = await query(sql, [name.toLowerCase()]);
//     return results.insertId;
//   } catch (error) {
//     await postErrors("Error deleting quick responses:", error);
//     throw error;
//   }
// };

module.exports = {
  getChannelMonitor,
  getChannelMonitorServer,
  addChannelMonitor,
};
