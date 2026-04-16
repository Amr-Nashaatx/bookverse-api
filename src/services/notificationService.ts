import { sseManager } from "./SSE/SSEManager.js";
import {
  INotification,
  NotificationModel,
} from "../models/notificationModel.js";
import mongoose from "mongoose";

type MongoId = mongoose.Types.ObjectId;

class NotificationService {
  async send(notification: INotification) {
    const newNotification = await NotificationModel.create(notification);
    sseManager.sendToUser(
      newNotification.recipientId,
      "notification",
      newNotification,
    );

    return newNotification;
  }

  async markRead(notificationId: MongoId, userId: MongoId) {
    await NotificationModel.findOneAndUpdate(
      { _id: notificationId },
      { readAt: new Date() },
    );

    sseManager.sendToUser(userId, "notification:read", { id: notificationId });
  }

  async getUnread(userId: MongoId) {
    const unread = await NotificationModel.find({
      recipientId: userId,
      hreadAt: null,
    });
    return unread;
  }

  async getUnreadCount(userId: MongoId) {
    const unreadCount = await NotificationModel.find({
      recipientId: userId,
      hreadAt: null,
    }).countDocuments();

    return unreadCount;
  }
}

export const notificationService = new NotificationService();
