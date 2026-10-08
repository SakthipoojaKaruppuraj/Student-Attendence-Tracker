const express = require("express");
const prisma = require("../config/db");
const { requireOrgAdmin, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

async function generateEventId() {
  const count = await prisma.event.count();
  return `EVT${String(count + 1).padStart(4, "0")}`;
}

// --------------------------------------------------
// NEWS & ANNOUNCEMENTS (POSTED ONLY BY ORG ADMIN)
// --------------------------------------------------

// GET all News (Visible to all users: Org Admin, Domain Admin, Students)
router.get("/news", async (req, res) => {
  try {
    const newsList = await prisma.news.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      news: newsList,
    });
  } catch (error) {
    console.error("Fetch news error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load news and announcements.",
    });
  }
});

// POST News (Org Admin Only)
router.post("/news", requireOrgAdmin, async (req, res) => {
  try {
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required to post news.",
      });
    }

    const newPost = await prisma.news.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        category: category ? category.trim() : "Announcement",
        postedBy: req.user?.username || "Management Admin",
      },
    });

    return res.status(201).json({
      success: true,
      message: "News announcement published successfully.",
      news: newPost,
    });
  } catch (error) {
    console.error("Post news error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to post news announcement.",
    });
  }
});

// DELETE News (Org Admin Only)
router.delete("/news/:id", requireOrgAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.news.delete({ where: { id } });
    return res.json({
      success: true,
      message: "News post deleted successfully.",
    });
  } catch (error) {
    console.error("Delete news error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete news post.",
    });
  }
});

// --------------------------------------------------
// EVENTS (PROPOSED BY DOMAIN ADMIN, APPROVED BY ORG ADMIN)
// --------------------------------------------------

// GET Events
router.get("/", async (req, res) => {
  try {
    const { status, domain, isOrgAdmin } = req.query;

    let whereClause = {};

    // Standard members (Students & Domain Admins view ONLY Approved events unless Org Admin asks for Pending/All)
    if (isOrgAdmin === "true") {
      if (status && status !== "All" && status !== "all") {
        whereClause.status = status;
      }
    } else {
      // Default for students and domain admin public view: Approved events only
      whereClause.status = "Approved";
    }

    if (domain && domain !== "All" && domain !== "all") {
      whereClause.domain = {
        in: [domain, "All", "all"],
      };
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("Fetch events error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load events.",
    });
  }
});

// GET Pending Event Requests (Org Admin Approval Portal)
router.get("/requests", requireOrgAdmin, async (req, res) => {
  try {
    const pendingEvents = await prisma.event.findMany({
      where: { status: "Pending" },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      requests: pendingEvents,
    });
  } catch (error) {
    console.error("Fetch event requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load event approval requests.",
    });
  }
});

// POST New Event (Domain Admin proposes -> Pending, Org Admin posts -> Approved)
router.post("/", async (req, res) => {
  try {
    const { title, description, eventDate, eventTime, venue, domain, organizer, role, createdById } = req.body;

    if (!title || !description || !eventDate) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and event date are required.",
      });
    }

    const eventId = await generateEventId();
    const isOrgAdminUser = role === "org_admin";
    const initialStatus = isOrgAdminUser ? "Approved" : "Pending";

    const newEvent = await prisma.event.create({
      data: {
        eventId,
        title: title.trim(),
        description: description.trim(),
        eventDate: eventDate.trim(),
        eventTime: eventTime ? eventTime.trim() : "TBD",
        venue: venue ? venue.trim() : "Campus Hall",
        domain: domain ? domain.trim() : "All",
        organizer: organizer ? organizer.trim() : "Domain Admin",
        status: initialStatus,
        createdByRole: role || "domain_admin",
        createdById: createdById || "ADM_UNKNOWN",
      },
    });

    return res.status(201).json({
      success: true,
      message: isOrgAdminUser
        ? "Event created and published successfully."
        : "Event proposal submitted to Management Admin for approval.",
      event: newEvent,
    });
  } catch (error) {
    console.error("Create event error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create event proposal.",
    });
  }
});

// REVIEW EVENT PROPOSAL (Org Admin Approve / Reject)
router.put("/:eventId/review", requireOrgAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, feedback } = req.body;

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status (Approved or Rejected) is required.",
      });
    }

    const existing = await prisma.event.findUnique({
      where: { eventId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    const updated = await prisma.event.update({
      where: { eventId },
      data: {
        status,
        feedback: feedback ? feedback.trim() : null,
      },
    });

    return res.json({
      success: true,
      message: `Event proposal has been ${status.toLowerCase()}.`,
      event: updated,
    });
  } catch (error) {
    console.error("Review event error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to review event proposal.",
    });
  }
});

// DELETE EVENT
router.delete("/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    await prisma.event.delete({ where: { eventId } });
    return res.json({
      success: true,
      message: "Event deleted successfully.",
    });
  } catch (error) {
    console.error("Delete event error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete event.",
    });
  }
});

module.exports = router;
