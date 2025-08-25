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

router.post('/', authenticateToken, upload.single('failureImage'), submitManualAttendance);

router.get('/my-requests', authenticateToken, getMyManualAttendanceRequests);

router.get('/admin/requests', authenticateToken, check_authorization(['admin']), getManualAttendanceRequests);

router.put('/admin/review/:id', authenticateToken, check_authorization(['admin']), reviewManualAttendance);

export default router;
