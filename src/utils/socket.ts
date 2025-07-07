// src/utils/socket.ts
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken"; // Giả sử bạn dùng JWT

// Một interface đơn giản cho payload của token
interface TokenPayload {
  id: string;
  // ... các thông tin khác trong token
}

export const registerSocketEvents = (io: Server) => {
  // Middleware để xác thực token ngay khi có kết nối mới
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      // Xác thực token (thay 'YOUR_SECRET_KEY' bằng key thật của bạn)
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || "YOUR_SECRET_KEY"
      ) as TokenPayload;
      // Gán thông tin user vào socket để sử dụng sau này
      (socket as any).user = { id: payload.id };
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).user.id;


    socket.join(userId);

    socket.on("custom_event", (data) => {
      socket.emit("response_event", { message: "Received your data!" });
    });

    socket.on("disconnect", () => {
    });
  });
};
