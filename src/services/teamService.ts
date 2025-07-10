import { Team, ITeam } from "../models/team";
import { TeamMember, ITeamMember } from "../models/teamMember";
import { Task, ITask } from "../models/task";
import { TeamChat, ITeamChat } from "../models/teamChat";
import { TeamMeeting, ITeamMeeting } from "../models/teamMeeting";
import { TeamDocument, ITeamDocument } from "../models/teamDocument";
import User from "../models/user";
import LeaveRequest from "../models/leave";
import NotificationService from "./notificationService";
import { socketService } from "./socketService";

export class TeamService {
  // ========================
  // TEAM MANAGEMENT
  // ========================
  
  static async createTeam(teamData: {
    name: string;
    description?: string;
    leaderId: string;
    departmentId?: string;
    memberIds?: string[];
  }): Promise<ITeam> {
    // Check if team name already exists in the same department
    const existingTeam = await Team.findOne({
      name: teamData.name,
      departmentId: teamData.departmentId || null,
      isActive: true,
    });

    if (existingTeam) {
      throw new Error('Team name already exists in this department');
    }

    const team = new Team({
      name: teamData.name,
      description: teamData.description,
      leaderId: teamData.leaderId,
      departmentId: teamData.departmentId,
    });

    await team.save();

    // Add leader as team member with leader role
    await TeamMember.create({
      teamId: team._id,
      userId: teamData.leaderId,
      role: 'leader',
    });

    // Add other members
    if (teamData.memberIds && teamData.memberIds.length > 0) {
      const memberPromises = teamData.memberIds.map(userId =>
        TeamMember.create({
          teamId: team._id,
          userId,
          role: 'member',
        })
      );
      await Promise.all(memberPromises);

      // Send notifications to new members
      const leader = await User.findById(teamData.leaderId);
      const notificationService = NotificationService.getInstance();
      const notificationPromises = teamData.memberIds.map(userId =>
        notificationService.createAndSendNotification({
          title: `You've been added to team "${team.name}"`,
          message: `${leader?.fullname} added you to the team`,
          type: 'team_invitation',
          recipientIds: [userId],
          data: { teamId: team._id, addedBy: teamData.leaderId },
        })
      );
      await Promise.all(notificationPromises);
    }

    return team;
  }

  static async getUserTeams(userId: string): Promise<any[]> {
    const teamMembers = await TeamMember.find({ 
      userId, 
      isActive: true 
    }).populate({
      path: 'teamId',
      populate: [
        { path: 'leaderId', select: 'fullname avatar email' },
        { path: 'departmentId', select: 'name' }
      ]
    });

    return teamMembers.map(tm => ({
      ...(tm.teamId as any).toObject(),
      userRole: tm.role,
      joinedAt: tm.joinedAt,
    }));
  }

  static async getTeamDetails(teamId: string, userId: string): Promise<any> {
    // Verify user is team member
    const teamMember = await TeamMember.findOne({
      teamId,
      userId,
      isActive: true
    });

    if (!teamMember) {
      throw new Error('You are not a member of this team');
    }

    const team = await Team.findById(teamId)
      .populate('leaderId', 'fullname avatar email')
      .populate('departmentId', 'name');

    const members = await TeamMember.find({ teamId, isActive: true })
      .populate('userId', 'fullname avatar email department position')
      .sort({ role: 1, joinedAt: 1 });

    // Get team statistics
    const stats = await this.getTeamStatsInternal(teamId);

    return {
      ...team!.toObject(),
      members,
      userRole: teamMember.role,
      stats,
    };
  }

  static async addTeamMember(teamId: string, userId: string, addedBy: string, role: 'member' | 'viewer' = 'member'): Promise<ITeamMember> {
    // Verify the person adding is team leader or admin
    const adderMember = await TeamMember.findOne({
      teamId,
      userId: addedBy,
      role: { $in: ['leader'] },
      isActive: true
    });

    if (!adderMember) {
      throw new Error('Only team leaders can add members');
    }

    // Check if user is already a member
    const existingMember = await TeamMember.findOne({ teamId, userId });
    if (existingMember) {
      if (existingMember.isActive) {
        throw new Error('User is already a team member');
      } else {
        // Reactivate member
        existingMember.isActive = true;
        existingMember.role = role;
        await existingMember.save();
        return existingMember;
      }
    }

    const teamMember = new TeamMember({
      teamId,
      userId,
      role,
    });

    await teamMember.save();

    // Add to team memberIds array
    await Team.findByIdAndUpdate(teamId, {
      $addToSet: { memberIds: userId }
    });

    // Send notification to new member
    const team = await Team.findById(teamId);
    const adder = await User.findById(addedBy);
    
    const notificationService = NotificationService.getInstance();
    await notificationService.createAndSendNotification({
      title: `You've been added to team "${team!.name}"`,
      message: `${adder!.fullname} added you to the team`,
      type: 'team_invitation',
      recipientIds: [userId],
      data: { teamId, addedBy },
    });

    return teamMember;
  }

  // ========================
  // TEAM STATISTICS
  // ========================

  static async getTeamStats(teamId: string, userId: string): Promise<any> {
    // Verify user is team member
    const teamMember = await TeamMember.findOne({
      teamId,
      userId,
      isActive: true
    });

    if (!teamMember) {
      throw new Error('You are not a member of this team');
    }

    const [
      totalMembers,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalMeetings,
      totalDocuments,
      totalMessages,
    ] = await Promise.all([
      TeamMember.countDocuments({ teamId, isActive: true }),
      Task.countDocuments({ teamId }),
      Task.countDocuments({ teamId, status: 'done' }),
      Task.countDocuments({ teamId, status: { $in: ['todo', 'in_progress', 'review'] } }),
      TeamMeeting.countDocuments({ teamId }),
      TeamDocument.countDocuments({ teamId }),
      TeamChat.countDocuments({ teamId }),
    ]);

    return {
      totalMembers,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalMeetings,
      totalDocuments,
      totalMessages,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }

  // ========================
  // CHAT MANAGEMENT
  // ========================

  static async getTeamChatHistory(teamId: string, page: number = 1, limit: number = 50): Promise<{
    messages: ITeamChat[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;
    
    const [messages, total] = await Promise.all([
      TeamChat.find({ teamId })
        .populate('senderId', 'fullname avatar email')
        .populate('replyTo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TeamChat.countDocuments({ teamId })
    ]);

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      total,
      hasMore: skip + messages.length < total,
    };
  }

  static async pinMessage(messageId: string, userId: string): Promise<void> {
    const message = await TeamChat.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify user is team leader
    const isLeader = await this.isTeamLeader(message.teamId.toString(), userId);
    if (!isLeader) {
      throw new Error('Only team leaders can pin messages');
    }

    message.isPinned = !message.isPinned;
    await message.save();

    // Emit real-time update
    socketService?.emitToTeam(message.teamId.toString(), 'chat:pinned', {
      messageId,
      isPinned: message.isPinned,
    });
  }

  // ========================
  // MEETING MANAGEMENT
  // ========================

  static async createMeeting(meetingData: {
    teamId: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    meetingLink?: string;
    attendeeIds: string[];
    createdBy: string;
  }): Promise<ITeamMeeting> {
    const meeting = new TeamMeeting({
      ...meetingData,
      attendees: meetingData.attendeeIds.map(userId => ({
        userId,
        status: 'invited',
      })),
    });

    await meeting.save();

    // Send notifications to attendees
    const creator = await User.findById(meetingData.createdBy);
    const notificationService = NotificationService.getInstance();
    const notificationPromises = meetingData.attendeeIds.map(userId =>
      notificationService.createAndSendNotification({
        title: `Meeting invitation: ${meetingData.title}`,
        message: `${creator!.fullname} invited you to a meeting`,
        type: 'meeting_invitation',
        recipientIds: [userId],
        data: {
          meetingId: meeting._id,
          teamId: meetingData.teamId,
          startTime: meetingData.startTime
        },
      })
    );

    await Promise.all(notificationPromises);

    // Emit real-time update
    socketService?.emitToTeam(meetingData.teamId, 'meeting:created', meeting);

    return meeting;
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

  private static async isTeamLeader(teamId: string, userId: string): Promise<boolean> {
    const teamMember = await TeamMember.findOne({
      teamId,
      userId,
      role: 'leader',
      isActive: true,
    });

    return !!teamMember;
  }

  private static async getTeamStatsInternal(teamId: string): Promise<any> {
    const [
      totalTasks,
      completedTasks,
      pendingTasks,
      totalMembers,
      totalMeetings,
      totalDocuments,
    ] = await Promise.all([
      Task.countDocuments({ teamId }),
      Task.countDocuments({ teamId, status: 'done' }),
      Task.countDocuments({ teamId, status: { $in: ['todo', 'in_progress'] } }),
      TeamMember.countDocuments({ teamId, isActive: true }),
      TeamMeeting.countDocuments({ teamId }),
      TeamDocument.countDocuments({ teamId }),
    ]);

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      totalMembers,
      totalMeetings,
      totalDocuments,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }
}
