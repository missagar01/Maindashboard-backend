import {
    createVisitRequestService,
    sendVisitRequestWhatsapp,
    getAllVisitsForAdminService,
    getVisitorByMobileService,
    sendVisitRequestWhatsappToGroup
} from "../services/requestService.js";
import {
    getVisitorPhotoPath,
    removeVisitorPhotoFile
} from "../middleware/s3Upload.js";
import { buildFrontendUrl } from "../utils/frontendUrl.js";

export const createVisitRequest = async (req, res, next) => {
    let shouldCleanupVisitorPhoto = false;

    try {
        const {
            visitorName,
            mobileNumber,
            visitorAddress,
            purposeOfVisit,
            personToMeet,
            dateOfVisit,
            timeOfEntry
        } = req.body;

        if (
            !visitorName ||
            !mobileNumber ||
            !personToMeet ||
            !dateOfVisit ||
            !timeOfEntry
        ) {
            await removeVisitorPhotoFile(req.file);
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const visitorPhoto = req.file
            ? getVisitorPhotoPath(req.file)
            : null;
        shouldCleanupVisitorPhoto = Boolean(visitorPhoto);

        const { visitorId, person } =
            await createVisitRequestService(
                req.body,
                visitorPhoto
            );
        shouldCleanupVisitorPhoto = false;

        const approvalPageUrl = buildFrontendUrl(req, "/gatepass/approvals");

        await sendVisitRequestWhatsapp(person, {
            visitorName,
            mobileNumber,
            visitorAddress,
            purposeOfVisit,
            dateOfVisit,
            timeOfEntry
        }, approvalPageUrl);

        await sendVisitRequestWhatsappToGroup(person, {
            visitorName,
            mobileNumber,
            visitorAddress,
            purposeOfVisit,
            dateOfVisit,
            timeOfEntry
        });

        res.status(201).json({
            success: true,
            visitorId,
            message: "Visit request created successfully"
        });
    } catch (err) {
        if (shouldCleanupVisitorPhoto) {
            await removeVisitorPhotoFile(req.file);
        }
        next(err);
    }
};

export const getAllVisitsForAdmin = async (req, res, next) => {
    try {
        const data = await getAllVisitsForAdminService();

        res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        next(err);
    }
};

export const getVisitorByMobile = async (req, res, next) => {
    try {
        const { mobile } = req.params;

        if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
            return res.status(400).json({
                success: false,
                message: "Invalid mobile number"
            });
        }

        const visitor = await getVisitorByMobileService(mobile);

        if (!visitor) {
            return res.status(404).json({
                success: false,
                found: false
            });
        }

        res.status(200).json({
            success: true,
            found: true,
            data: visitor
        });
    } catch (err) {
        next(err);
    }
};

