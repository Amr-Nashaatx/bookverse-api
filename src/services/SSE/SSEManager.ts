import crypto from "crypto";
import { Response } from "express";
import mongoose from "mongoose";
import { setSSEHeaders } from "../../utils/utils.js";

class SSEManager {
  connections: Connections;
  constructor() {
    this.connections = new Map();
  }

  addClient(userId: MongoId, res: Response) {
    const userKey = userId.toString();

    // prevent multi-tab connections by removing existing one
    if (this.connections.has(userKey)) {
      const existingConn = this.connections.get(userKey);
      clearInterval(existingConn?.heartbeat);
      existingConn?.res.end();
      this.connections.delete(userKey);
    }

    setSSEHeaders(res);
    res.flushHeaders?.();

    const connId = crypto.randomUUID();
    const newConn = {
      connId,
      res,
      heartbeat: setInterval(() => {
        try {
          res.write(": ping\n\n");
        } catch (error) {
          this.removeClient(userId);
        }
      }, 30_000),
    };

    this.connections.set(userKey, newConn);
    this.sendToUser(userId, "connected", { connected: true });
    return connId;
  }

  removeClient(userId: MongoId, connId?: ConnectionDetails["connId"]) {
    const userKey = userId.toString();
    const client = this.connections.get(userKey);
    if (!client) return;
    if (connId && client.connId !== connId) return;

    clearInterval(client.heartbeat);
    this.connections.delete(userKey);
  }

  sendToUser(userId: MongoId, event: string, data: any) {
    const userKey = userId.toString();
    const client = this.connections.get(userKey);
    if (!client) return false;

    try {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch (error) {
      this.removeClient(userId);
      return false;
    }
  }
  get connectionsCount() {
    return this.connections.size;
  }
}

type MongoId = mongoose.Types.ObjectId;
interface ConnectionDetails {
  heartbeat: NodeJS.Timeout;
  res: Response;
  connId: ReturnType<typeof crypto.randomUUID>;
}

type Connections = Map<string, ConnectionDetails>;
export const sseManager = new SSEManager();
