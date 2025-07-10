import { Task, ITask } from "../models/task";
import { TeamMember } from "../models/teamMember";
import User from "../models/user";
import LeaveRequest from "../models/leave";
import NotificationService from "./notificationService";
import { socketService } from "./socketService";

export class TaskService {
  // ========================
  // TASK MANAGEMENT
  // ========================

  static async createTask(taskData: {
    title: string;
    description?: string;
    assignedTo: string;
    createdBy: string;
    teamId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: Date;
    tags?: string[];
    estimatedHours?: number;
  }): Promise<ITask> {
    // Check if assigned user is on leave
    const isOnLeave = await this.checkUserLeaveStatus(taskData.assignedTo);
    if (isOnLeave) {
      throw new Error('Cannot assign task to user who is currently on leave');
    }

    // If teamId is provided, verify the creator has permission
    if (taskData.teamId) {
      const canCreateTask = await this.canUserCreateTaskInTeam(taskData.createdBy, taskData.teamId);
      if (!canCreateTask) {
        throw new Error('You do not have permission to create tasks in this team');
      }
    }

    const task = new Task(taskData);
    await task.save();

    // Populate task data
    await task.populate([
      { path: 'assignedTo', select: 'fullname avatar email' },
      { path: 'createdBy', select: 'fullname avatar email' },
      { path: 'teamId', select: 'name' }
    ]);

    // Send notification to assigned user
    const creator = await User.findById(taskData.createdBy);
    const notificationService = NotificationService.getInstance();
    await notificationService.createAndSendNotification({
      title: `New task assigned: ${taskData.title}`,
      message: `${creator?.fullname} assigned you a new task`,
      type: 'task_assignment',
      recipientIds: [taskData.assignedTo],
      data: {
        taskId: task._id,
        teamId: taskData.teamId,
        priority: taskData.priority
      },
    });

    // Emit real-time update to team if task belongs to a team
    if (taskData.teamId) {
      socketService?.emitToTeam(taskData.teamId, 'task:created', task);
    }

    // Emit to assigned user
    socketService?.emitToUser(taskData.assignedTo, 'task:assigned', task);

    return task;
  }

  static async updateTaskStatus(taskId: string, status: string, userId: string): Promise<ITask> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Verify user can update this task (assigned user, creator, or team leader)
    const canUpdate = await this.canUserUpdateTask(task, userId);
    if (!canUpdate) {
      throw new Error('You do not have permission to update this task');
    }

    const oldStatus = task.status;
    task.status = status as any;
    await task.save();

    // Populate for response
    await task.populate([
      { path: 'assignedTo', select: 'fullname avatar email' },
      { path: 'createdBy', select: 'fullname avatar email' }
    ]);

    // Send notification if status changed to done
    if (status === 'done' && oldStatus !== 'done') {
      const updater = await User.findById(userId);
      const notificationService = NotificationService.getInstance();
      await notificationService.createAndSendNotification({
        title: `Task completed: ${task.title}`,
        message: `${updater?.fullname} marked the task as completed`,
        type: 'task_completed',
        recipientIds: [task.createdBy.toString()],
        data: { taskId: task._id, teamId: task.teamId },
      });
    }

    // Emit real-time updates
    if (task.teamId) {
      socketService?.emitToTeam(task.teamId.toString(), 'task:updated', task);
    }
    socketService?.emitToUser(task.assignedTo.toString(), 'task:updated', task);
    socketService?.emitToUser(task.createdBy.toString(), 'task:updated', task);

    return task;
  }

  static async getUserTasks(userId: string, filters?: {
    status?: string;
    priority?: string;
    teamId?: string;
    dueDate?: 'overdue' | 'today' | 'week';
  }): Promise<ITask[]> {
    const query: any = {
      $or: [
        { assignedTo: userId },
        { createdBy: userId }
      ]
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.priority) {
      query.priority = filters.priority;
    }

    if (filters?.teamId) {
      query.teamId = filters.teamId;
    }

    if (filters?.dueDate) {
      const now = new Date();
      switch (filters.dueDate) {
        case 'overdue':
          query.dueDate = { $lt: now };
          query.status = { $nin: ['done', 'cancelled'] };
          break;
        case 'today':
          const startOfDay = new Date(now.setHours(0, 0, 0, 0));
          const endOfDay = new Date(now.setHours(23, 59, 59, 999));
          query.dueDate = { $gte: startOfDay, $lte: endOfDay };
          break;
        case 'week':
          const weekFromNow = new Date();
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          query.dueDate = { $lte: weekFromNow };
          query.status = { $nin: ['done', 'cancelled'] };
          break;
      }
    }

    return Task.find(query)
      .populate('assignedTo', 'fullname avatar email')
      .populate('createdBy', 'fullname avatar email')
      .populate('teamId', 'name')
      .sort({ createdAt: -1 });
  }

  static async getTeamTasks(teamId: string, status?: string): Promise<ITask[]> {
    const query: any = { teamId };
    if (status) {
      query.status = status;
    }

    return Task.find(query)
      .populate('assignedTo', 'fullname avatar email')
      .populate('createdBy', 'fullname avatar email')
      .sort({ createdAt: -1 });
  }

  static async addTaskComment(taskId: string, userId: string, message: string): Promise<ITask> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.comments.push({
      userId: userId as any,
      message,
      createdAt: new Date(),
    });

    await task.save();
    await task.populate('comments.userId', 'fullname avatar');

    // Send notifications to task participants
    const participants = [task.assignedTo.toString(), task.createdBy.toString()];
    const uniqueParticipants = [...new Set(participants)].filter(id => id !== userId);

    const commenter = await User.findById(userId);
    const notificationService = NotificationService.getInstance();
    const notificationPromises = uniqueParticipants.map(participantId =>
      notificationService.createAndSendNotification({
        title: `New comment on task: ${task.title}`,
        message: `${commenter?.fullname}: ${message.substring(0, 50)}...`,
        type: 'task_comment',
        recipientIds: [participantId],
        data: { taskId: task._id, teamId: task.teamId },
      })
    );

    await Promise.all(notificationPromises);

    // Emit real-time update
    if (task.teamId) {
      socketService?.emitToTeam(task.teamId.toString(), 'task:comment', {
        taskId: task._id,
        comment: task.comments[task.comments.length - 1],
      });
    }

    return task;
  }

  // ========================
  // HELPER METHODS
  // ========================

  private static async checkUserLeaveStatus(userId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeLeave = await LeaveRequest.findOne({
      employeeId: userId,
      status: 'approved',
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    return !!activeLeave;
  }

  private static async canUserCreateTaskInTeam(userId: string, teamId: string): Promise<boolean> {
    const teamMember = await TeamMember.findOne({
      teamId,
      userId,
      role: { $in: ['leader', 'member'] },
      isActive: true,
    });

    return !!teamMember;
  }

  private static async canUserUpdateTask(task: ITask, userId: string): Promise<boolean> {
    // Task assigned to user
    if (task.assignedTo.toString() === userId) {
      return true;
    }

    // Task created by user
    if (task.createdBy.toString() === userId) {
      return true;
    }

    // User is team leader (if task belongs to a team)
    if (task.teamId) {
      const teamMember = await TeamMember.findOne({
        teamId: task.teamId,
        userId,
        role: 'leader',
        isActive: true,
      });
      return !!teamMember;
    }

    return false;
  }

  static async getTaskStats(userId?: string, teamId?: string): Promise<any> {
    const matchQuery: any = {};
    
    if (userId) {
      matchQuery.$or = [
        { assignedTo: userId },
        { createdBy: userId }
      ];
    }
    
    if (teamId) {
      matchQuery.teamId = teamId;
    }

    const stats = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$dueDate', null] },
                    { $lt: ['$dueDate', new Date()] },
                    { $nin: ['$status', ['done', 'cancelled']] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      todo: 0,
      inProgress: 0,
      review: 0,
      done: 0,
      cancelled: 0,
      overdue: 0,
    };

    result.completionRate = result.total > 0 ? Math.round((result.done / result.total) * 100) : 0;
    result.activeTask = result.total - result.done - result.cancelled;

    return result;
  }
}
