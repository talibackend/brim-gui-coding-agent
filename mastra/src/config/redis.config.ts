// @ts-nocheck

import { RedisStore } from "@mastra/redis";

const redisStorage = new RedisStore({
    id : "redis-store",
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB
}) as any;

export default async ()=>{
    await redisStorage.init();
    return redisStorage.getClient();
}