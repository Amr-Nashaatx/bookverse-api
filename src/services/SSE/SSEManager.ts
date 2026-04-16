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
    // prevent multi-tab connections by removing existing one
    if (this.connections.has(userId)) {
      const existingConn = this.connections.get(userId);
      clearInterval(existingConn?.heartbeat);
      existingConn?.res.end();
      this.connections.delete(userId);
    }

    setSSEHeaders(res);
    const connId = crypto.randomUUID();
    const newConn = {
      connId,
      res,
      heartbeat: setInterval(() => {
        try {
          res.send(`: ping \n\n`);
        } catch (error) {
          this.removeClient(userId);
        }
      }, 30_000),
    };

    this.connections.set(userId, newConn);
  }

  removeClient(userId: MongoId) {
    const client = this.connections.get(userId);
    if (!client) return;

    clearInterval(client.heartbeat);
    this.connections.delete(userId);
  }

  sendToUser(userId: MongoId, event: string, data: any) {
    const client = this.connections.get(userId);
    if (!client) return false;

    try {
      client.res.send({ event, data });
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

type Connections = Map<MongoId, ConnectionDetails>;
export const sseManager = new SSEManager();
