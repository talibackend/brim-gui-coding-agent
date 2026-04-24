import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_CONNECTION_STRING
});

export async function getRedisClient() {
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}