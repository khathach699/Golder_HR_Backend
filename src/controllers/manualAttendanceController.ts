import { Request, Response } from 'express';
import ManualAttendance, { IManualAttendance } from '../models/ManualAttendance';
import Attendance from '../models/attendance';
import { uploadToCloudinary } from '../utils/cloudinary';

/**
 * @swagger
 * /api/attendance/manual-attendance:
 *   post:
 *     summary: Submit manual attendance request
 *     tags: [Manual Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - reason
 *               - isCheckIn
 *               - timestamp
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: Employee's full name
 *               reason:
 *                 type: string
 *                 description: Reason for manual attendance
 *               isCheckIn:
 *                 type: boolean
 *                 description: Whether this is check-in or check-out
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Attendance timestamp
 *               deviceInfo:
 *                 type: string
 *                 description: JSON string of device information
 *               latitude:
 *                 type: number
 *                 description: GPS latitude
 *               longitude:
 *                 type: number
 *                 description: GPS longitude
 *               accuracy:
 *                 type: number
 *                 description: GPS accuracy
 *               failureImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional failure evidence image
 *     responses:
 *       201:
 *         description: Manual attendance request submitted successfully
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const submitManualAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const {
      fullName,
      reason,
      isCheckIn,
      timestamp,
      deviceInfo,
      latitude,
      longitude,
      accuracy,
      address,
    } = req.body;

    // Validate required fields
    if (!fullName || !reason || isCheckIn === undefined || !timestamp) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: fullName, reason, isCheckIn, timestamp',
      });
      return;
    }

    // Parse device info if it's a string
    let parsedDeviceInfo;
    try {
      parsedDeviceInfo = typeof deviceInfo === 'string' ? JSON.parse(deviceInfo) : deviceInfo;
      console.log('Parsed device info:', parsedDeviceInfo);

      // Ensure required fields exist
      if (!parsedDeviceInfo.deviceId) {
        console.warn('Missing deviceId in device info, using fallback');
        parsedDeviceInfo.deviceId = parsedDeviceInfo.id || 'unknown';
      }
    } catch (error) {
      console.error('Error parsing device info:', error);
      parsedDeviceInfo = {
        deviceId: 'unknown',
        platform: 'unknown',
        model: 'unknown',
        version: 'unknown'
      };
    }

    // Add location to device info if provided
    if (latitude && longitude) {
      parsedDeviceInfo.location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : 0,
        timestamp: new Date().toISOString(),
        address: address || 'Không xác định được địa chỉ',
      };
    }

    // Handle failure image upload
    let failureImageUrl = null;
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'manual-attendance');
        failureImageUrl = uploadResult;
      } catch (uploadError) {
        console.error('Error uploading failure image:', uploadError);
        // Continue without image if upload fails
      }
    }

    // Create manual attendance record
    const manualAttendance = new ManualAttendance({
      userId,
      fullName: fullName.trim(),
      reason: reason.trim(),
      failureImage: failureImageUrl,
      deviceInfo: parsedDeviceInfo,
      isCheckIn: isCheckIn === 'true' || isCheckIn === true,
      timestamp: new Date(timestamp),
      status: 'pending',
    });

    await manualAttendance.save();

    // Populate user info for response
    await manualAttendance.populate('userId', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Manual attendance request submitted successfully',
      data: {
        manualAttendance,
      },
    });
  } catch (error) {
    console.error('Error submitting manual attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

/**
 * Get manual attendance requests (Admin only)
 */
export const getManualAttendanceRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, userId, startDate, endDate } = req.query;

    // Build filter
    const filter: any = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (userId) {
      filter.userId = userId;
    }
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate as string);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      ManualAttendance.find(filter)
        .populate('userId', 'fullName email department')
        .populate('reviewedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ManualAttendance.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching manual attendance requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Review manual attendance request (Admin only)
 */
export const reviewManualAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;
    const reviewerId = (req as any).user?._id;

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"',
      });
      return;
    }

    const manualAttendance = await ManualAttendance.findById(id);
    if (!manualAttendance) {
      res.status(404).json({
        success: false,
        message: 'Manual attendance request not found',
      });
      return;
    }

    if (manualAttendance.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'This request has already been reviewed',
      });
      return;
    }

    // Update manual attendance record
    manualAttendance.status = status;
    manualAttendance.adminNote = adminNote;
    manualAttendance.reviewedBy = reviewerId;
    manualAttendance.reviewedAt = new Date();
    await manualAttendance.save();

    // If approved, create actual attendance record
    if (status === 'approved') {
      try {
        const workDate = manualAttendance.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Create attendance entry
        const attendanceEntry: any = {
          time: manualAttendance.timestamp,
          imageUrl: manualAttendance.failureImage || null,
          location: manualAttendance.deviceInfo.location ? {
            coordinates: {
              type: 'Point',
              coordinates: [
                manualAttendance.deviceInfo.location.longitude,
                manualAttendance.deviceInfo.location.latitude,
              ],
            },
            address: manualAttendance.deviceInfo.location.address || 'Manual attendance location',
          } : null,
          isManual: true,
          manualAttendanceId: manualAttendance._id,
          deviceInfo: {
            deviceId: manualAttendance.deviceInfo.deviceId,
            platform: manualAttendance.deviceInfo.platform,
            model: manualAttendance.deviceInfo.model,
            brand: manualAttendance.deviceInfo.brand,
            version: manualAttendance.deviceInfo.version,
          },
        };

        // Find existing attendance record for this date
        let attendance = await Attendance.findOne({
          employeeId: manualAttendance.userId,
          workDate: workDate,
        });

        if (attendance) {
          // Update existing record
          if (manualAttendance.isCheckIn) {
            if (!attendance.checkIns) attendance.checkIns = [];
            attendance.checkIns.push(attendanceEntry);
            // Update backward compatibility field
            if (!attendance.checkIn) {
              attendance.checkIn = attendanceEntry;
            }
          } else {
            if (!attendance.checkOuts) attendance.checkOuts = [];
            attendance.checkOuts.push(attendanceEntry);
            // Update backward compatibility field
            if (!attendance.checkOut) {
              attendance.checkOut = attendanceEntry;
            }
          }
        } else {
          // Create new attendance record
          const attendanceData = {
            employeeId: manualAttendance.userId,
            workDate: workDate,
            checkIns: manualAttendance.isCheckIn ? [attendanceEntry] : [],
            checkOuts: manualAttendance.isCheckIn ? [] : [attendanceEntry],
            checkIn: manualAttendance.isCheckIn ? attendanceEntry : undefined,
            checkOut: manualAttendance.isCheckIn ? undefined : attendanceEntry,
            status: 'PRESENT',
          };

          attendance = new Attendance(attendanceData);
        }

        await attendance.save();
        console.log('✅ Attendance record created/updated successfully for approved manual attendance');
      } catch (attendanceError: any) {
        console.error('❌ Error creating attendance record:', attendanceError);
        console.error('Error details:', attendanceError?.message || 'Unknown error');
        // Don't fail the review if attendance creation fails, but log it
      }
    }

    // Create notification for user
    try {
      const notificationTitle = status === 'approved'
        ? 'Yêu cầu chấm công được duyệt'
        : 'Yêu cầu chấm công bị từ chối';

      const notificationMessage = status === 'approved'
        ? `Yêu cầu chấm công ${manualAttendance.isCheckIn ? 'vào' : 'ra'} lúc ${manualAttendance.timestamp.toLocaleString('vi-VN')} đã được duyệt.`
        : `Yêu cầu chấm công ${manualAttendance.isCheckIn ? 'vào' : 'ra'} lúc ${manualAttendance.timestamp.toLocaleString('vi-VN')} đã bị từ chối. ${adminNote ? `Lý do: ${adminNote}` : ''}`;

      // Create notification directly using mongoose
      const mongoose = require('mongoose');
      const notificationData = {
        userId: manualAttendance.userId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'manual_attendance_review',
        data: {
          manualAttendanceId: manualAttendance._id,
          status: status,
          adminNote: adminNote,
        },
        isRead: false,
        createdAt: new Date(),
      };

      // Try to create notification using the notification model
      const Notification = mongoose.model('notification');
      await Notification.create(notificationData);

      console.log('✅ Notification created successfully for manual attendance review');
    } catch (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
      // Don't fail the review if notification creation fails
    }

    // Populate for response
    await manualAttendance.populate([
      { path: 'userId', select: 'fullName email' },
      { path: 'reviewedBy', select: 'fullName email' },
    ]);

    res.json({
      success: true,
      message: `Manual attendance request ${status} successfully`,
      data: {
        manualAttendance,
      },
    });
  } catch (error) {
    console.error('Error reviewing manual attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get user's own manual attendance requests
 */
export const getMyManualAttendanceRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    const { page = 1, limit = 10, status } = req.query;

    const filter: any = { userId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      ManualAttendance.find(filter)
        .populate('reviewedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ManualAttendance.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user manual attendance requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
