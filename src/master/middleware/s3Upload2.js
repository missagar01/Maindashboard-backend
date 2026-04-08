import multer from "multer";

const storage = multer.memoryStorage();
const allowedImageMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

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
    }
});

export const fileToDataUrl = (file) => {
    if (!file?.buffer || !file?.mimetype) {
        const error = new Error("Image file is required");
        error.statusCode = 400;
        throw error;
    }

    return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};

export default upload;
