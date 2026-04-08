import fs from "fs";
import path from "path";
import multer from "multer";

const VISITOR_UPLOAD_ROUTE = "/uploads/visitors";
const visitorUploadsDir = path.join(process.cwd(), "uploads", "visitors");

if (!fs.existsSync(visitorUploadsDir)) {
    fs.mkdirSync(visitorUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, visitorUploadsDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `visitor-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (_req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mimetype = (file.mimetype || "").toLowerCase();

    const isAllowedImage =
        allowedImageTypes.test(ext) && allowedImageTypes.test(mimetype);

    if (!isAllowedImage) {
        return cb(
            new Error("Visitor photo must be a JPEG, PNG, GIF, or WebP image.")
        );
    }

    cb(null, true);
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

const normalizeUploadValue = (value) =>
    String(value || "").trim().replace(/\\/g, "/");

export const getVisitorPhotoPath = (fileOrPath) => {
    const rawValue =
        typeof fileOrPath === "string"
            ? fileOrPath
            : fileOrPath?.filename || fileOrPath?.path || "";

    const normalizedValue = normalizeUploadValue(rawValue);
    if (!normalizedValue) {
        return null;
    }

    const uploadPathMatch = normalizedValue.match(
        /\/uploads\/visitors\/[^?#"'\s]+/i
    );
    if (uploadPathMatch) {
        return uploadPathMatch[0];
    }

    const filename = path.posix.basename(normalizedValue.split(/[?#]/)[0]);
    return filename ? `${VISITOR_UPLOAD_ROUTE}/${filename}` : null;
};

export const removeVisitorPhotoFile = async (fileOrPath) => {
    const filePath =
        typeof fileOrPath === "object" && fileOrPath?.path
            ? fileOrPath.path
            : path.join(
                  process.cwd(),
                  String(getVisitorPhotoPath(fileOrPath) || "").replace(/^\/+/, "")
              );

    if (!filePath) {
        return;
    }

    try {
        await fs.promises.unlink(filePath);
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.warn("Failed to remove visitor photo:", err.message);
        }
    }
};

export default upload;
