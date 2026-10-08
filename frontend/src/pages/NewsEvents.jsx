import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import OrgAdminSidebar from "../components/OrgAdminSidebar";
import "../styles/NewsEvents.css";

function NewsEvents() {
  const navigate = useNavigate();
  const [role, setRole] = useState("student"); // "org_admin", "domain_admin", "student"
  const [userDomain, setUserDomain] = useState("All");
  const [userName, setUserName] = useState("");

  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  // Modals
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // News Form
  const [newsTitle, setNewsTitle] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [newsCategory, setNewsCategory] = useState("Announcement");

  // Event Form
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDomain, setEventDomain] = useState("All");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Detect user role
    const adminData = localStorage.getItem("admin");
    const orgToken = localStorage.getItem("orgAdminToken");

    if (adminData) {
      try {
        const parsed = JSON.parse(adminData);
        setRole(parsed.role || "domain_admin");
        setUserDomain(parsed.domain || "All");
        setUserName(parsed.name || parsed.username || "Admin");
      } catch (e) {}
    } else if (orgToken) {
      setRole("org_admin");
      setUserName("Management Admin");
    } else {
      const studentData = localStorage.getItem("student");
      if (studentData) {
        try {
          const s = JSON.parse(studentData);
          setRole("student");
          setUserDomain(s.soiLabVertical || s.department || "All");
          setUserName(s.studentName || "Student");
        } catch (e) {}
      }
    }

    fetchNewsAndEvents();
  }, []);

  const getApiUrl = (path) => {
    const base = import.meta.env.VITE_API_URL || "";
    return `${base}${path}`;
  };

  const fetchNewsAndEvents = async () => {
    try {
      setLoading(true);

      // Detect org admin status
      const adminData = localStorage.getItem("admin");
      let isOrg = false;
      if (adminData) {
        try {
          const parsed = JSON.parse(adminData);
          if (parsed.role === "org_admin") isOrg = true;
        } catch (e) {}
      }

      // Fetch News
      let newsRes;
      try {
        newsRes = await axios.get(getApiUrl("/api/events/news"));
      } catch {
        newsRes = await axios.get("http://localhost:5001/api/events/news");
      }
      if (newsRes.data.success) {
        setNews(newsRes.data.news || []);
      }

      // Fetch Events
      let eventsRes;
      try {
        eventsRes = await axios.get(getApiUrl(`/api/events?isOrgAdmin=${isOrg}`));
      } catch {
        eventsRes = await axios.get(`http://localhost:5001/api/events?isOrgAdmin=${isOrg}`);
      }
      if (eventsRes.data.success) {
        setEvents(eventsRes.data.events || []);
      }

      // If Org Admin, fetch Pending Requests
      if (isOrg) {
        const orgToken = localStorage.getItem("orgAdminToken") || localStorage.getItem("adminToken");
        let reqRes;
        try {
          reqRes = await axios.get(getApiUrl("/api/events/requests"), {
            headers: { Authorization: `Bearer ${orgToken}` },
          });
        } catch {
          reqRes = await axios.get("http://localhost:5001/api/events/requests", {
            headers: { Authorization: `Bearer ${orgToken}` },
          });
        }
        if (reqRes.data.success) {
          setRequests(reqRes.data.requests || []);
        }
      }
    } catch (error) {
      console.error("Error loading news & events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Post News (Org Admin Only)
  const handlePostNews = async (e) => {
    e.preventDefault();
    if (!newsTitle || !newsContent) {
      alert("Please enter title and content.");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("orgAdminToken") || localStorage.getItem("adminToken");
      let res;
      try {
        res = await axios.post(
          getApiUrl("/api/events/news"),
          { title: newsTitle, content: newsContent, category: newsCategory },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        res = await axios.post(
          "http://localhost:5001/api/events/news",
          { title: newsTitle, content: newsContent, category: newsCategory },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      if (res.data.success) {
        alert("News announcement posted successfully!");
        setShowNewsModal(false);
        setNewsTitle("");
        setNewsContent("");
        fetchNewsAndEvents();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to post news.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Event Proposal
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle || !eventDescription || !eventDate) {
      alert("Please fill in required event fields.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: eventTitle,
        description: eventDescription,
        eventDate,
        eventTime,
        venue: eventVenue,
        domain: role === "domain_admin" ? userDomain : eventDomain,
        organizer: userName,
        role,
      };

      let res;
      try {
        res = await axios.post(getApiUrl("/api/events"), payload);
      } catch {
        res = await axios.post("http://localhost:5001/api/events", payload);
      }

      if (res.data.success) {
        alert(res.data.message);
        setShowEventModal(false);
        setEventTitle("");
        setEventDescription("");
        setEventDate("");
        setEventTime("");
        setEventVenue("");
        fetchNewsAndEvents();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit event.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Review Event Request (Org Admin Approve / Reject)
  const handleReviewRequest = async (eventId, status) => {
    try {
      const token = localStorage.getItem("orgAdminToken") || localStorage.getItem("adminToken");
      let res;
      try {
        res = await axios.put(
          getApiUrl(`/api/events/${eventId}/review`),
          { status },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        res = await axios.put(
          `http://localhost:5001/api/events/${eventId}/review`,
          { status },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      if (res.data.success) {
        fetchNewsAndEvents();
      }
    } catch (err) {
      alert("Failed to update event review status.");
    }
  };

  // Handle Delete News
  const handleDeleteNews = async (id) => {
    if (!window.confirm("Are you sure you want to delete this news post?")) return;
    try {
      const token = localStorage.getItem("orgAdminToken") || localStorage.getItem("adminToken");
      await axios.delete(getApiUrl(`/api/events/news/${id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNewsAndEvents();
    } catch (err) {
      alert("Failed to delete news post.");
    }
  };

  // Handle Delete Event
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await axios.delete(getApiUrl(`/api/events/${eventId}`));
      fetchNewsAndEvents();
    } catch (err) {
      alert("Failed to delete event.");
    }
  };

  return (
    <div className={`news-events-container ${role === "org_admin" || role === "domain_admin" ? "with-sidebar" : ""}`}>
      {role === "org_admin" ? (
        <OrgAdminSidebar />
      ) : role === "domain_admin" ? (
        <Sidebar />
      ) : null}

      <main className="news-events-content">
        {role === "student" && (
          <div className="student-news-header">
            <button className="btn-back" onClick={() => navigate("/student/dashboard")}>
              ⬅️ Back to Student Dashboard
            </button>
            <span className="student-badge">🎓 {userName} ({userDomain})</span>
          </div>
        )}

        {/* Header */}
        <div className="page-header">
          <div>
            <h1>📢 Campus News & Events</h1>
            <p>Stay updated with official announcements and upcoming domain events.</p>
          </div>

          <div className="action-buttons-group">
            {role === "org_admin" && (
              <button className="btn-primary" onClick={() => setShowNewsModal(true)}>
                ➕ Post News Announcement
              </button>
            )}

            {(role === "org_admin" || role === "domain_admin") && (
              <button className="btn-secondary" onClick={() => setShowEventModal(true)}>
                🗓️ {role === "org_admin" ? "Create Event" : "Propose New Event"}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading News & Events...</div>
        ) : (
          <div className="news-events-grid">
            {/* ------------------------------------------------ */}
            {/* PENDING EVENT REQUESTS (MANAGEMENT ADMIN ONLY) */}
            {/* ------------------------------------------------ */}
            {role === "org_admin" && (
              <div className="section-card">
                <div className="section-title">
                  <span>⏳ Pending Event Approval Requests</span>
                  <span className="badge-count">{requests.length} Pending</span>
                </div>

                {requests.length === 0 ? (
                  <div className="empty-state">No pending event requests from Domain Admins.</div>
                ) : (
                  <div className="events-grid">
                    {requests.map((reqItem) => (
                      <div key={reqItem.id} className="event-card" style={{ borderLeft: "4px solid #d97706" }}>
                        <div className="event-header">
                          <h4 className="event-title">{reqItem.title}</h4>
                          <span className="status-badge status-pending">Pending Review</span>
                        </div>

                        <div className="event-meta">
                          <div className="event-meta-item">📍 {reqItem.domain}</div>
                          <div className="event-meta-item">📅 {reqItem.eventDate}</div>
                          <div className="event-meta-item">⏰ {reqItem.eventTime}</div>
                          <div className="event-meta-item">🏢 {reqItem.venue}</div>
                          <div className="event-meta-item">👤 By {reqItem.organizer}</div>
                        </div>

                        <p className="event-description">{reqItem.description}</p>

                        <div className="event-actions">
                          <button
                            className="btn-approve"
                            onClick={() => handleReviewRequest(reqItem.eventId, "Approved")}
                          >
                            ✅ Approve Event
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => handleReviewRequest(reqItem.eventId, "Rejected")}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------ */}
            {/* OFFICIAL NEWS ANNOUNCEMENTS */}
            {/* ------------------------------------------------ */}
            <div className="section-card">
              <div className="section-title">
                <span>📰 Official News & Announcements</span>
                <span className="badge-count">{news.length} Posts</span>
              </div>

              {news.length === 0 ? (
                <div className="empty-state">No news announcements posted yet.</div>
              ) : (
                <div className="news-grid">
                  {news.map((n) => (
                    <div key={n.id} className="news-card">
                      <span className="news-category">{n.category || "Announcement"}</span>
                      <h4 className="news-title">{n.title}</h4>
                      <p className="news-content">{n.content}</p>
                      <div className="news-footer">
                        <span>Posted by {n.postedBy} • {new Date(n.createdAt).toLocaleDateString()}</span>
                        {role === "org_admin" && (
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteNews(n.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ------------------------------------------------ */}
            {/* UPCOMING & PUBLISHED EVENTS */}
            {/* ------------------------------------------------ */}
            <div className="section-card">
              <div className="section-title">
                <span>🗓️ Upcoming Events</span>
                <span className="badge-count">
                  {events.filter((e) => e.status === "Approved").length} Active
                </span>
              </div>

              {events.filter((e) => e.status === "Approved" || e.organizer === userName).length === 0 ? (
                <div className="empty-state">No upcoming events scheduled.</div>
              ) : (
                <div className="events-grid">
                  {events
                    .filter((e) => e.status === "Approved" || role === "org_admin" || e.organizer === userName)
                    .map((evt) => (
                      <div key={evt.id} className="event-card">
                        <div className="event-header">
                          <h4 className="event-title">{evt.title}</h4>
                          <span
                            className={`status-badge ${
                              evt.status === "Approved"
                                ? "status-approved"
                                : evt.status === "Rejected"
                                ? "status-rejected"
                                : "status-pending"
                            }`}
                          >
                            {evt.status}
                          </span>
                        </div>

                        <div className="event-meta">
                          <div className="event-meta-item">📍 Domain: {evt.domain}</div>
                          <div className="event-meta-item">📅 {evt.eventDate}</div>
                          {evt.eventTime && <div className="event-meta-item">⏰ {evt.eventTime}</div>}
                          {evt.venue && <div className="event-meta-item">🏢 {evt.venue}</div>}
                          <div className="event-meta-item">👤 {evt.organizer}</div>
                        </div>

                        <p className="event-description">{evt.description}</p>

                        {(role === "org_admin" || evt.organizer === userName) && (
                          <div className="news-footer" style={{ marginTop: "12px" }}>
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteEvent(evt.eventId)}
                            >
                              Remove Event
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------ */}
      {/* POST NEWS MODAL (ORG ADMIN) */}
      {/* ------------------------------------------------ */}
      {showNewsModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>➕ Post News Announcement</h3>
              <button className="close-btn" onClick={() => setShowNewsModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handlePostNews}>
              <div className="form-group">
                <label>Category</label>
                <select
                  className="form-control"
                  value={newsCategory}
                  onChange={(e) => setNewsCategory(e.target.value)}
                >
                  <option value="Announcement">Announcement</option>
                  <option value="Important Notice">Important Notice</option>
                  <option value="Achievement">Achievement</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter news title..."
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Content *</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Enter full announcement message..."
                  value={newsContent}
                  onChange={(e) => setNewsContent(e.target.value)}
                  required
                ></textarea>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowNewsModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Publishing..." : "Publish News"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* CREATE / PROPOSE EVENT MODAL */}
      {/* ------------------------------------------------ */}
      {showEventModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>
                {role === "org_admin" ? "🗓️ Create Campus Event" : "🗓️ Propose Event (Approval Required)"}
              </h3>
              <button className="close-btn" onClick={() => setShowEventModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. AI & Web3 Hackathon 2026"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Describe event details, eligibility, schedule..."
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>Event Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Event Time</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 10:00 AM - 4:00 PM"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>Venue / Location</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Main Auditorium / Lab 3"
                    value={eventVenue}
                    onChange={(e) => setEventVenue(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Target Domain</label>
                  <input
                    type="text"
                    className="form-control"
                    value={role === "domain_admin" ? userDomain : eventDomain}
                    onChange={(e) => setEventDomain(e.target.value)}
                    disabled={role === "domain_admin"}
                  />
                </div>
              </div>

              {role === "domain_admin" && (
                <p style={{ fontSize: "12px", color: "#d97706", marginBottom: "16px" }}>
                  ⚠️ Note: Your event proposal will be submitted to the Management Admin for approval before appearing publicly.
                </p>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEventModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Submitting..." : role === "org_admin" ? "Publish Event" : "Submit Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewsEvents;
