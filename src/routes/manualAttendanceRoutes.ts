import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, check_authorization } from '../middlewares/authMiddleware';
import {
  submitManualAttendance,
  getManualAttendanceRequests,
  reviewManualAttendance,
  getMyManualAttendanceRequests,
} from '../controllers/manualAttendanceController';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

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
router.post('/', authenticateToken, upload.single('failureImage'), submitManualAttendance);

/**
 * @swagger
 * /api/attendance/manual-attendance/my-requests:
 *   get:
 *     summary: Get user's own manual attendance requests
 *     tags: [Manual Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, all]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: User's manual attendance requests retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/my-requests', authenticateToken, getMyManualAttendanceRequests);

/**
 * @swagger
 * /api/attendance/manual-attendance/admin/requests:
 *   get:
 *     summary: Get all manual attendance requests (Admin only)
 *     tags: [Manual Attendance Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, all]
 *         description: Filter by status
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *     responses:
 *       200:
 *         description: Manual attendance requests retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/requests', authenticateToken, check_authorization(['admin']), getManualAttendanceRequests);

/**
 * @swagger
 * /api/attendance/manual-attendance/admin/review/{id}:
 *   put:
 *     summary: Review manual attendance request (Admin only)
 *     tags: [Manual Attendance Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Manual attendance request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: Review decision
 *               adminNote:
 *                 type: string
 *                 description: Optional admin note
 *     responses:
 *       200:
 *         description: Manual attendance request reviewed successfully
 *       400:
 *         description: Bad request - invalid status or already reviewed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Manual attendance request not found
 *       500:
 *         description: Internal server error
 */
router.put('/admin/review/:id', authenticateToken, check_authorization(['admin']), reviewManualAttendance);

export default router;
