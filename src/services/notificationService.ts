import { sseManager } from "./SSE/SSEManager.js";
import { NotificationModel } from "../models/notificationModel.js";
import mongoose from "mongoose";

type MongoId = mongoose.Types.ObjectId;
type NotificationInput = {
  recipientId: MongoId;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
};

class NotificationService {
  async send(notification: NotificationInput) {
    const newNotification = await NotificationModel.create(notification);
    sseManager.sendToUser(
      newNotification.recipientId,
      "notification",
      newNotification,
    );

    return newNotification;
  }

  async markRead(notificationId: MongoId, userId: MongoId) {
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { readAt: new Date() },
      { new: true },
    );

    if (notification) {
      sseManager.sendToUser(userId, "notification:read", {
        id: notificationId,
      });
    }
  }

  async getUnread(userId: MongoId) {
    const unread = await NotificationModel.find({
      recipientId: userId,
      readAt: null,
    }).sort({ createdAt: -1 });
    return unread;
  }

  async getUnreadCount(userId: MongoId) {
    const unreadCount = await NotificationModel.find({
      recipientId: userId,
      readAt: null,
    }).countDocuments();

    return unreadCount;
  }
}

export const notificationService = new NotificationService();
