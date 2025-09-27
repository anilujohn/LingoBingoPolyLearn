import dotenv from "dotenv";

dotenv.config({ path: ".env" });

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}
