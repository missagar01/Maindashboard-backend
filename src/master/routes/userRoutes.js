import express from "express";
import { getEmpImage, getUserProfile, patchEmpImage } from "../controllers/userController.js";
import upload from "../middleware/s3Upload2.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
    "/:id",
    getUserProfile
);

router.get(
    "/:id/emp-image",
    getEmpImage
);



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
