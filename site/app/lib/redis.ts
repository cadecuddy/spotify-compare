import { createClient } from "redis";

const redisClient = createClient({
    url: "redis://redis:6379",
});

// redisClient.on("error", (err) => console.error("Redis Client Error", err));

export async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log("REDIS CONNECTED")
    }
}

export default redisClient;
