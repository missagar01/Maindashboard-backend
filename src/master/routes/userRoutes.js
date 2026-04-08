import express from "express";
import { patchEmpImage } from "../controllers/userController.js";
import upload from "../middleware/s3Upload2.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

const uploadEmpImage = (req, res, next) => {
    if (req.is("multipart/form-data")) {
        return upload.single("profile_img")(req, res, next);
    }

    next();
};

router.patch(
    "/:id/emp-image",
    uploadEmpImage,
    patchEmpImage
);

export default router;
