import { getProfileImageUrl } from "../middleware/s3Upload2.js";
import { getEmpImageService, getUserByIdService, updateEmpImageService } from "../services/userService.js";

const ensureSelfOrAdmin = (authUser, targetUserId) => {
    const isAdmin = authUser.role === "admin" || authUser.user_name === "admin";
    if (!isAdmin && String(authUser.id) !== String(targetUserId)) {
        const error = new Error("Forbidden: You can only access your own profile image");
        error.statusCode = 403;
        throw error;
    }
};

const isDatabaseConnectivityError = (error) => {
    if (!error) return false;

    const message = String(error.message || error).toLowerCase();
    const code = String(error.code || "").toUpperCase();

    return (
        ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "ECONNRESET"].includes(code) ||
        message.includes("getaddrinfo enotfound") ||
        message.includes("could not translate host name") ||
        message.includes("connection terminated") ||
        message.includes("connection timeout") ||
        message.includes("timeout expired") ||
        message.includes("failed to connect")
    );
};

export const getEmpImage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const authUser = req.user;

        ensureSelfOrAdmin(authUser, id);

        const user = await getEmpImageService(id);

        res.json({
            success: true,
            message: "Profile image fetched successfully",
            user,
            imageUrl: user.profile_img || user.emp_image || null,
        });
    } catch (err) {
        if (req.user?.auth_fallback && isDatabaseConnectivityError(err)) {
            return res.json({
                success: true,
                message: "Profile image fetched from token fallback",
                user: {
                    id: req.user.id,
                    emp_image: null,
                    profile_img: null,
                },
                imageUrl: null,
            });
        }

        next(err);
    }
};

export const getUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const authUser = req.user;

        ensureSelfOrAdmin(authUser, id);

        const user = await getUserByIdService(id);

        res.json({
            success: true,
            data: user,
        });
    } catch (err) {
        if (req.user?.auth_fallback && isDatabaseConnectivityError(err)) {
            return res.json({
                success: true,
                data: req.user,
            });
        }

        next(err);
    }
};

export const patchEmpImage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const authUser = req.user;

        ensureSelfOrAdmin(authUser, id);

        // If file was uploaded via multipart, build URL path from disk file
        // Otherwise fall back to body (for URL string sent directly)
        let profileImageUrl;

        if (req.file) {
            // File uploaded — build /uploads/users/filename URL
            profileImageUrl = getProfileImageUrl(req.file);
        } else if (req.body?.profile_img) {
            profileImageUrl = req.body.profile_img.trim();
        }

        if (!profileImageUrl || typeof profileImageUrl !== "string") {
            return res.status(400).json({ message: "profile_img is required" });
        }

        // Validate: must be a /uploads/ path URL (not a base64 data URL)
        const isValidUrl = profileImageUrl.startsWith("/uploads/");
        if (!isValidUrl) {
            return res.status(400).json({
                message: "profile_img must be a valid upload URL (e.g. /uploads/users/filename.jpg)",
            });
        }

        const user = await updateEmpImageService(id, profileImageUrl);

        res.json({
            message: "Profile image updated successfully",
            user,
        });
    } catch (err) {
        console.error("Patch Emp Image Error:", err.message);
        next(err);
    }
};
