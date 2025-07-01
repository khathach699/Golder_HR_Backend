"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = __importDefault(require("firebase-admin"));
class FirebaseService {
    constructor() {
        // Kiểm tra Firebase configuration
        if (!process.env.FIREBASE_PROJECT_ID ||
            !process.env.FIREBASE_PRIVATE_KEY ||
            !process.env.FIREBASE_CLIENT_EMAIL) {
            console.warn("⚠️ Firebase configuration not found. Firebase services will be disabled.");
            // Khởi tạo app rỗng để tránh lỗi
            this.app = firebase_admin_1.default.initializeApp({
                projectId: "dummy-project",
            }, "dummy-app");
            return;
        }
        try {
            // Khởi tạo Firebase Admin SDK với thông tin từ environment variables
            const serviceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            };
            this.app = firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID,
            });
            console.log("✅ Firebase Admin SDK initialized successfully");
        }
        catch (error) {
            console.error("❌ Error initializing Firebase Admin SDK:", error);
            // Khởi tạo app rỗng để tránh lỗi
            this.app = firebase_admin_1.default.initializeApp({
                projectId: "dummy-project",
            }, "dummy-fallback");
        }
    }
    static getInstance() {
        if (!FirebaseService.instance) {
            FirebaseService.instance = new FirebaseService();
        }
        return FirebaseService.instance;
    }
    /**
     * Kiểm tra xem Firebase có được cấu hình đúng không
     */
    isFirebaseConfigured() {
        return !!(process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_PRIVATE_KEY &&
            process.env.FIREBASE_CLIENT_EMAIL);
    }
    /**
     * Gửi notification đến một device token cụ thể
     */
    async sendNotificationToDevice(token, title, body, data) {
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
                        priority: "high",
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
            const response = await firebase_admin_1.default.messaging().send(message);
            console.log("Successfully sent message:", response);
            return response;
        }
        catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    }
    /**
     * Gửi notification đến nhiều device tokens
     */
    async sendNotificationToMultipleDevices(tokens, title, body, data) {
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
                        priority: "high",
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
            const response = await firebase_admin_1.default.messaging().sendEachForMulticast(message);
            console.log("Successfully sent messages:", response);
            return response;
        }
        catch (error) {
            console.error("Error sending messages:", error);
            throw error;
        }
    }
    /**
     * Gửi notification đến topic
     */
    async sendNotificationToTopic(topic, title, body, data) {
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
                        priority: "high",
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
            const response = await firebase_admin_1.default.messaging().send(message);
            console.log("Successfully sent message to topic:", response);
            return response;
        }
        catch (error) {
            console.error("Error sending message to topic:", error);
            throw error;
        }
    }
    /**
     * Subscribe device token to topic
     */
    async subscribeToTopic(tokens, topic) {
        try {
            const response = await firebase_admin_1.default.messaging().subscribeToTopic(tokens, topic);
            console.log("Successfully subscribed to topic:", response);
            return response;
        }
        catch (error) {
            console.error("Error subscribing to topic:", error);
            throw error;
        }
    }
    /**
     * Unsubscribe device token from topic
     */
    async unsubscribeFromTopic(tokens, topic) {
        try {
            const response = await firebase_admin_1.default
                .messaging()
                .unsubscribeFromTopic(tokens, topic);
            console.log("Successfully unsubscribed from topic:", response);
            return response;
        }
        catch (error) {
            console.error("Error unsubscribing from topic:", error);
            throw error;
        }
    }
    /**
     * Validate FCM token
     */
    async validateToken(token) {
        try {
            await firebase_admin_1.default.messaging().send({
                token,
                data: { test: "true" },
            }, true); // dry run
            return true;
        }
        catch (error) {
            console.error("Invalid token:", error);
            return false;
        }
    }
}
exports.default = FirebaseService;
