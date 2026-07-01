import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-streams-adapter";
import IORedis from "ioredis";
import {
  SocketIoRealtimeGateway,
  RealtimeFanout,
} from "@tbrpg/realtime";
import { verifySessionToken } from "./auth";
import { registerHandlers, handleFanoutMessage } from "./handlers";

const port = Number(process.env.REALTIME_PORT ?? 3001);
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

const httpServer = createServer();
const pubClient = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const subClient = pubClient.duplicate();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

io.adapter(createAdapter(pubClient, subClient));

const socketMeta = new Map<
  string,
  { playerId: string; campaignId?: string; partyId?: string; sceneId?: string }
>();

const gateway = new SocketIoRealtimeGateway(
  io,
  pubClient,
  (connectionId) => socketMeta.get(connectionId),
);

const fanout = new RealtimeFanout(pubClient, (envelope) => {
  handleFanoutMessage(gateway, envelope).catch(console.error);
});

void fanout.subscribe().then(() => {
  console.log("[realtime] subscribed to Redis fan-out channel");
});

io.use(async (socket, next) => {
  const token =
    (socket.handshake.auth?.token as string | undefined) ??
    socket.handshake.headers.authorization?.replace("Bearer ", "");

  const user = await verifySessionToken(token);
  if (!user) {
    return next(new Error("Unauthorized"));
  }

  (socket.data as { user: typeof user }).user = user;
  socketMeta.set(socket.id, { playerId: user.userId });
  next();
});

registerHandlers(io, gateway, fanout);

httpServer.listen(port, () => {
  console.log(`[realtime] Socket.IO service listening on :${port}`);
  console.log(`[realtime] Redis Streams adapter enabled`);
  console.log(
    `[realtime] Inline resolve: ${process.env.REALTIME_INLINE_RESOLVE === "true" ? "on" : "off (worker)"}`,
  );
});

process.on("SIGINT", async () => {
  await pubClient.quit();
  await subClient.quit();
  process.exit(0);
});
