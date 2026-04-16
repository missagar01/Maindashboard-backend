import {
  fetchGatePassesService,
  closeGatePassService,
  sendGateCloseWhatsappMessage
} from "../services/closePassService.js";

export const getGatePasses = async (req, res, next) => {
  try {
    const { personToMeet, showAll } = req.query;
    const shouldShowAll = String(showAll || "").toLowerCase() === "true";

    if (!shouldShowAll && !personToMeet) {
      return res.status(400).json({
        success: false,
        message: "personToMeet required"
      });
    }

    const data = await fetchGatePassesService(personToMeet, shouldShowAll);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const closeGatePass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { personToMeet, closedBy, showAll } = req.body;
    const shouldShowAll = Boolean(showAll);

    if (!shouldShowAll && !personToMeet) {
      return res.status(400).json({
        success: false,
        message: "personToMeet required"
      });
    }

    const visit = await closeGatePassService(id, personToMeet, shouldShowAll);

    const formattedVisitDate = new Date(
      visit.date_of_visit
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });

    const formattedExitTime = visit.visitor_out_time
      ? visit.visitor_out_time.toString().slice(0, 5)
      : "-";

    const formattedEntryTime = visit.time_of_entry
      ? visit.time_of_entry.toString().slice(0, 5)
      : "-";

    const message = `
*Gate Pass:* CLOSED
*Visitor Name:* ${visit.visitor_name}
*Person To Meet:* ${visit.person_to_meet}
*Visit Date:* ${formattedVisitDate}
*Time of Entry:* ${formattedEntryTime}
*Exit Time:* ${formattedExitTime}
*Closed By:* ${closedBy || personToMeet}
*Status:* CLOSED
        `;

    await sendGateCloseWhatsappMessage(message);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
