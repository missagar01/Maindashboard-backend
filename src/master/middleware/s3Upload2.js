import multer from "multer";
import path from "path";
import fs from "fs";

const allowedImageMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

// Ensure uploads/users directory exists
const uploadsDir = path.join(process.cwd(), "uploads", "users");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Disk storage â€” saves file to uploads/users/
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `user-profile-${uniqueSuffix}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!allowedImageMimeTypes.includes(file.mimetype)) {
            const error = new Error("Invalid file format. Allowed formats: JPEG, PNG, GIF, WebP.");
            error.statusCode = 400;
            return cb(error);
        }

        cb(null, true);
    },
});

/**
 * Build a URL-format path for the uploaded file.
 * Returns something like: /uploads/users/user-profile-1712345678-123456789.jpg
 */
export const getProfileImageUrl = (file) => {
    if (!file?.filename) {
        const error = new Error("Image file is required");
        error.statusCode = 400;
        throw error;
    }

    return `/uploads/users/${file.filename}`;
};

export default upload;



