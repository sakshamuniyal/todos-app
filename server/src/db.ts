import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DB_URL) {
  throw new Error("DB_URL is not configured");
}

const client = new Pool({
  connectionString: process.env.DB_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});

client.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export { client };