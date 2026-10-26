import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');

// Make sure the uploads folder exists at startup
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Save files to disk with unique names
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `poster-${unique}${ext}`);
  },
});

// Reject anything that is not jpeg / png / webp
const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter,
});

/**
 * posterUpload middleware — wraps multer so its errors flow into the
 * central error handler as clean JSON instead of crashing the request.
 */
export const posterUpload = (req, res, next) => {
  upload.single('poster')(req, res, (err) => {
    if (!err) return next();

    // multer-specific size / field errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(400)
        .json({ success: false, message: 'Poster file is too large. Maximum size is 2 MB.' });
    }
    // fileFilter error or any other multer error
    return res.status(400).json({ success: false, message: err.message });
  });
};
