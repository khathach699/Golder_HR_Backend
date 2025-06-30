import admin from "firebase-admin";
import { ServiceAccount } from "firebase-admin";

class FirebaseService {
  private static instance: FirebaseService;
  private app: admin.app.App;

  private constructor() {
    // Kiểm tra Firebase configuration
    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_PRIVATE_KEY ||
      !process.env.FIREBASE_CLIENT_EMAIL
    ) {
      console.warn(
        "⚠️ Firebase configuration not found. Firebase services will be disabled."
      );
      // Khởi tạo app rỗng để tránh lỗi
      this.app = admin.initializeApp(
        {
          projectId: "dummy-project",
        },
        "dummy-app"
      );
      return;
    }

    try {
      // Khởi tạo Firebase Admin SDK với thông tin từ environment variables
      const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      console.log("✅ Firebase Admin SDK initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing Firebase Admin SDK:", error);
      // Khởi tạo app rỗng để tránh lỗi
      this.app = admin.initializeApp(
        {
          projectId: "dummy-project",
        },
        "dummy-fallback"
      );
    }
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * Kiểm tra xem Firebase có được cấu hình đúng không
   */
  private isFirebaseConfigured(): boolean {
    return !!(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    );
  }

  /**
   * Gửi notification đến một device token cụ thể
   */
  public async sendNotificationToDevice(
    token: string,
    title: string,
    body: string,
    data?: { [key: string]: string }
  ): Promise<string> {
    if (!this.isFirebaseConfigured()) {
      console.warn("⚠️ Firebase not configured. Notification not sent.");
      return "firebase-not-configured";
    }

    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token,
        android: {
          notification: {
            sound: "default",
            priority: "high" as const,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log("Successfully sent message:", response);
      return response;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  /**
   * Gửi notification đến nhiều device tokens
   */
  public async sendNotificationToMultipleDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: { [key: string]: string }
  ): Promise<admin.messaging.BatchResponse> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        tokens,
        android: {
          notification: {
            sound: "default",
            priority: "high" as const,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log("Successfully sent messages:", response);
      return response;
    } catch (error) {
      console.error("Error sending messages:", error);
      throw error;
    }
  }

  /**
   * Gửi notification đến topic
   */
  public async sendNotificationToTopic(
    topic: string,
    title: string,
    body: string,
    data?: { [key: string]: string }
  ): Promise<string> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        topic,
        android: {
          notification: {
            sound: "default",
            priority: "high" as const,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log("Successfully sent message to topic:", response);
      return response;
    } catch (error) {
      console.error("Error sending message to topic:", error);
      throw error;
    }
  }

  /**
   * Subscribe device token to topic
   */
  public async subscribeToTopic(tokens: string[], topic: string): Promise<any> {
    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      console.log("Successfully subscribed to topic:", response);
      return response;
    } catch (error) {
      console.error("Error subscribing to topic:", error);
      throw error;
    }
  }

  /**
   * Unsubscribe device token from topic
   */
  public async unsubscribeFromTopic(
    tokens: string[],
    topic: string
  ): Promise<any> {
    try {
      const response = await admin
        .messaging()
        .unsubscribeFromTopic(tokens, topic);
      console.log("Successfully unsubscribed from topic:", response);
      return response;
    } catch (error) {
      console.error("Error unsubscribing from topic:", error);
      throw error;
    }
  }

  /**
   * Validate FCM token
   */
  public async validateToken(token: string): Promise<boolean> {
    try {
      await admin.messaging().send(
        {
          token,
          data: { test: "true" },
        },
        true
      ); // dry run
      return true;
    } catch (error) {
      console.error("Invalid token:", error);
      return false;
    }
  }
}

export default FirebaseService;
