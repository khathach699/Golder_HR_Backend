import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { TeamChat } from "../models/teamChat";
import { TeamMember } from "../models/teamMember";
import User from "../models/user";
import NotificationService from "./notificationService";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

interface ChatMessage {
  teamId: string;
  message: string;
  type: 'text' | 'file' | 'image';
  attachments?: any[];
  mentions?: string[];
  replyTo?: string;
}

export class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = (user as any)._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 User ${socket.user?.fullname} connected: ${socket.id}`);
      
      // Store user connection
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
      }

      // Join user to their teams
      this.joinUserTeams(socket);

      // Handle chat events
      this.handleChatEvents(socket);

      // Handle team events
      this.handleTeamEvents(socket);

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 User ${socket.user?.fullname} disconnected: ${socket.id}`);
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
      });
    });
  }

  private async joinUserTeams(socket: AuthenticatedSocket) {
    try {
      const userTeams = await TeamMember.find({ 
        userId: socket.userId, 
        isActive: true 
      }).populate('teamId');

      userTeams.forEach(teamMember => {
        const teamId = (teamMember.teamId as any)._id.toString();
        socket.join(`team:${teamId}`);
        console.log(`👥 User ${socket.user?.fullname} joined team: ${teamId}`);
      });
    } catch (error) {
      console.error('Error joining user teams:', error);
    }
  }

  private handleChatEvents(socket: AuthenticatedSocket) {
    // Send message
    socket.on('chat:send', async (data: ChatMessage) => {
      try {
        // Verify user is member of the team
        const teamMember = await TeamMember.findOne({
          teamId: data.teamId,
          userId: socket.userId,
          isActive: true
        });

        if (!teamMember) {
          socket.emit('error', { message: 'You are not a member of this team' });
          return;
        }

        // Create chat message
        const chatMessage = new TeamChat({
          teamId: data.teamId,
          senderId: socket.userId,
          message: data.message,
          type: data.type || 'text',
          attachments: data.attachments || [],
          mentions: data.mentions || [],
          replyTo: data.replyTo || null,
        });

        await chatMessage.save();
        await chatMessage.populate('senderId', 'fullname avatar email');

        // Emit to team room
        this.io.to(`team:${data.teamId}`).emit('chat:message', {
          _id: chatMessage._id,
          teamId: chatMessage.teamId,
          sender: chatMessage.senderId,
          message: chatMessage.message,
          type: chatMessage.type,
          attachments: chatMessage.attachments,
          mentions: chatMessage.mentions,
          replyTo: chatMessage.replyTo,
          createdAt: chatMessage.createdAt,
        });

        // Send notifications to mentioned users
        if (data.mentions && data.mentions.length > 0) {
          await this.sendMentionNotifications(data.teamId, data.mentions, socket.user, data.message);
        }

      } catch (error) {
        console.error('Error sending chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('chat:typing', (data: { teamId: string; isTyping: boolean }) => {
      socket.to(`team:${data.teamId}`).emit('chat:typing', {
        userId: socket.userId,
        user: socket.user,
        isTyping: data.isTyping,
      });
    });

    // Message reactions
    socket.on('chat:react', async (data: { messageId: string; emoji: string }) => {
      try {
        const message = await TeamChat.findById(data.messageId);
        if (!message) return;

        // Check if user already reacted with this emoji
        const existingReaction = message.reactions.find(
          r => r.userId.toString() === socket.userId && r.emoji === data.emoji
        );

        if (existingReaction) {
          // Remove reaction
          message.reactions = message.reactions.filter(
            r => !(r.userId.toString() === socket.userId && r.emoji === data.emoji)
          );
        } else {
          // Add reaction
          message.reactions.push({
            userId: socket.userId as any,
            emoji: data.emoji,
            createdAt: new Date(),
          });
        }

        await message.save();

        // Emit to team room
        this.io.to(`team:${message.teamId}`).emit('chat:reaction', {
          messageId: data.messageId,
          reactions: message.reactions,
        });

      } catch (error) {
        console.error('Error handling reaction:', error);
      }
    });
  }

  private handleTeamEvents(socket: AuthenticatedSocket) {
    // Join specific team room
    socket.on('team:join', (teamId: string) => {
      socket.join(`team:${teamId}`);
      console.log(`👥 User ${socket.user?.fullname} joined team room: ${teamId}`);
    });

    // Leave team room
    socket.on('team:leave', (teamId: string) => {
      socket.leave(`team:${teamId}`);
      console.log(`👥 User ${socket.user?.fullname} left team room: ${teamId}`);
    });
  }

  private async sendMentionNotifications(teamId: string, mentionedUserIds: string[], sender: any, message: string) {
    try {
      for (const userId of mentionedUserIds) {
        const notificationService = NotificationService.getInstance();
        await notificationService.createAndSendNotification({
          title: `${sender.fullname} mentioned you in team chat`,
          message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          type: 'team_mention',
          recipientIds: [userId],
          data: {
            teamId,
            senderId: sender._id,
            senderName: sender.fullname,
          },
        });

        // Send real-time notification if user is online
        const userSocketId = this.connectedUsers.get(userId);
        if (userSocketId) {
          this.io.to(userSocketId).emit('notification:new', {
            title: `${sender.fullname} mentioned you`,
            message: message.substring(0, 100),
            type: 'team_mention',
          });
        }
      }
    } catch (error) {
      console.error('Error sending mention notifications:', error);
    }
  }

  // Public methods for external use
  public emitToTeam(teamId: string, event: string, data: any) {
    this.io.to(`team:${teamId}`).emit(event, data);
  }

  public emitToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}

export let socketService: SocketService;
