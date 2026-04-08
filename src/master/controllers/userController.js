import { fileToDataUrl } from "../middleware/s3Upload2.js";
import { updateEmpImageService } from "../services/userService.js";

export const patchEmpImage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const authUser = req.user;
        const bodyProfileImageUrl = req.body?.profile_img;

        // AUTH CHECK: User can only update their own image, unless they are admin
        const isAdmin = authUser.role === "admin" || authUser.user_name === "admin";
        if (!isAdmin && String(authUser.id) !== String(id)) {
            const error = new Error("Forbidden: You can only update your own profile image");
            error.statusCode = 403;
            return next(error);
        }

        const profileImageUrl = req.file ? fileToDataUrl(req.file) : bodyProfileImageUrl;

        if (!profileImageUrl || typeof profileImageUrl !== "string") {
            return res.status(400).json({ message: "profile_img is required" });
        }

        const normalizedProfileImageUrl = profileImageUrl.trim();
        const isSupportedProfileImage = /^data:image\/(jpeg|jpg|png|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(
            normalizedProfileImageUrl
        );

        if (!isSupportedProfileImage) {
            return res.status(400).json({ message: "profile_img must be a valid image data URL" });
        }

        const user = await updateEmpImageService(id, normalizedProfileImageUrl);

        res.json({
            message: "Profile image updated successfully",
            user,
        });
    } catch (err) {
        console.error("Patch Emp Image Error:", err.message);
        next(err);
    }
};
