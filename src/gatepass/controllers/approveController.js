import {
    fetchVisitsForApprovalService,
    updateVisitApprovalService,
    sendApprovalWhatsappMessage,
    getPersonToMeetDetailsService,
    sendClosePassLinkWhatsapp
} from "../services/approveService.js";
import { buildFrontendUrl } from "../utils/frontendUrl.js";

export const getVisitsForApproval = async (req, res, next) => {
    try {
        const { personToMeet } = req.query;

        if (!personToMeet) {
            return res.status(400).json({
                success: false,
                message: "personToMeet required"
            });
        }

        const visits = await fetchVisitsForApprovalService(personToMeet);

        res.json({ success: true, visits });
    } catch (err) {
        next(err);
    }
};

export const updateVisitApproval = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, approvedBy } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        const visit = await updateVisitApprovalService(
            id,
            status,
            approvedBy
        );
        const person = await getPersonToMeetDetailsService(visit.person_to_meet);
        const closePassUrl = buildFrontendUrl(req, "/gatepass/close-pass");
        const normalizedStatus = status.toUpperCase();
        const groupMessageLines = [
            `*Gate Pass:* ${normalizedStatus}`,
            `*Visitor Name:* ${visit.visitor_name}`,
            `*Person To Meet:* ${visit.person_to_meet}`,
            `*Status:* ${normalizedStatus}`,
            `*Approved By:* ${approvedBy}`
        ];
        const message = `\n${groupMessageLines.join("\n")}\n`;

        await sendApprovalWhatsappMessage(message);

        if (status === "approved") {
            const closeLinkMessage = `
*Gate Pass:* APPROVED
*Visitor Name:* ${visit.visitor_name}
*Person To Meet:* ${visit.person_to_meet}
*Approved By:* ${approvedBy}
*Open Close Pass Page:*
${closePassUrl}
            `;

            await sendClosePassLinkWhatsapp(person, closeLinkMessage);
        }

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};
