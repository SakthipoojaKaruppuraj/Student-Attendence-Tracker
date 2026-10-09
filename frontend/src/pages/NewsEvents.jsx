import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import OrgAdminSidebar from "../components/OrgAdminSidebar";
import StudentSidebar from "../components/StudentSidebar";
import "../styles/NewsEvents.css";

function NewsEvents() {
  const navigate = useNavigate();
  const location = useLocation();

  // Role & User State
  const [role, setRole] = useState("student"); // "org_admin", "domain_admin", "student"
  const [userDomain, setUserDomain] = useState("All");
  const [userName, setUserName] = useState("User");
  const [userInitials, setUserInitials] = useState("U");

  // Data Lists
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // LinkedIn Post Modal State
  const [showPostModal, setShowPostModal] = useState(false);
  const [postType, setPostType] = useState("news"); // "news" | "event" | "achievement"

  // Unified Form Inputs
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postCategory, setPostCategory] = useState("Announcement");
  const [postAudience, setPostAudience] = useState("Anyone (Campus)");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  // Event-Specific Fields
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDomain, setEventDomain] = useState("All");

  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Interactive Local Post States (Likes, Comments, Attending)
  const [likedPosts, setLikedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [attendingEvents, setAttendingEvents] = useState({});
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState("");

  useEffect(() => {
    const path = location.pathname;

    if (path.startsWith("/student")) {
      setRole("student");
      const studentData = localStorage.getItem("student");
      if (studentData) {
        try {
          const s = JSON.parse(studentData);
          setUserDomain(s.soiLabVertical || s.department || "All");
          const name = s.studentName || "Student";
          setUserName(name);
          setUserInitials(getInitials(name));
        } catch (e) {}
      }
    } else if (path.startsWith("/org-admin")) {
      setRole("org_admin");
      const adminData = localStorage.getItem("admin");
      if (adminData) {
        try {
          const parsed = JSON.parse(adminData);
          setUserDomain(parsed.domain || "All");
          const name = parsed.name || parsed.username || "Management Admin";
          setUserName(name);
          setUserInitials(getInitials(name));
        } catch (e) {}
      } else {
        setUserName("Management Admin");
        setUserInitials("MA");
      }
    } else if (path.startsWith("/admin")) {
      setRole("domain_admin");
      const adminData = localStorage.getItem("admin");
      if (adminData) {
        try {
          const parsed = JSON.parse(adminData);
          setUserDomain(parsed.domain || "All");
          const name = parsed.name || parsed.username || "Domain Admin";
          setUserName(name);
          setUserInitials(getInitials(name));
        } catch (e) {}
      }
    } else {
      const studentData = localStorage.getItem("student");
      const adminData = localStorage.getItem("admin");
      if (studentData && !adminData) {
        setRole("student");
      } else if (adminData) {
        try {
          const parsed = JSON.parse(adminData);
          setRole(parsed.role || "domain_admin");
        } catch (e) {
          setRole("domain_admin");
        }
      }
    }

    fetchNewsAndEvents(path);
  }, [location.pathname]);

  const getInitials = (nameStr) => {
    if (!nameStr) return "U";
    const parts = nameStr.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const getApiUrl = (path) => {
    const base = import.meta.env.VITE_API_URL || "";
    return `${base}${path}`;
  };

  const fetchNewsAndEvents = async (currentPath = location.pathname) => {
    try {
      setLoading(true);
      const isOrg = currentPath.startsWith("/org-admin");

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
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Error loading news & events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Open Modal with specific tab
  const openPostModal = (type = "news") => {
    setPostType(type);
    if (type === "event") {
      setPostCategory("Campus Event");
    } else if (type === "achievement") {
      setPostCategory("Achievement");
    } else {
      setPostCategory("Announcement");
    }
    setShowPostModal(true);
  };

  // Handle Image File Selection
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Quick Emoji Insertion
  const addEmoji = (emoji) => {
    setPostContent((prev) => prev + " " + emoji);
  };

  // Handle Post Submission (Unified LinkedIn Creation)
  const handleSubmitPost = async (e) => {
    e.preventDefault();

    if (!postTitle.trim() || !postContent.trim()) {
      alert("Please fill in the post title and content.");
      return;
    }

    if (postType === "event" && !eventDate) {
      alert("Please select an event date.");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("orgAdminToken") || localStorage.getItem("adminToken");

      if (postType === "event") {
        // Submit Event Proposal or Event Creation
        const payload = {
          title: postTitle,
          description: postContent,
          eventDate,
          eventTime: eventTime || "10:00 AM - 4:00 PM",
          venue: eventVenue || "Campus Auditorium",
          domain: role === "domain_admin" ? userDomain : eventDomain,
          organizer: userName,
          imageUrl: imageUrl || null,
          role,
        };

        let res;
        try {
          res = await axios.post(getApiUrl("/api/events"), payload);
        } catch {
          res = await axios.post("http://localhost:5001/api/events", payload);
        }

        if (res.data.success) {
          showToast(res.data.message || "Event created successfully!");
          resetModalForm();
          fetchNewsAndEvents();
        }
      } else {
        // Submit News / Announcement / Achievement
        if (role !== "org_admin" && role !== "domain_admin") {
          alert("Only Management and Domain Admins can post official announcements.");
          setSubmitting(false);
          return;
        }

        let res;
        const payload = {
          title: postTitle,
          content: postContent,
          category: postCategory,
          imageUrl: imageUrl || null,
        };

        try {
          res = await axios.post(getApiUrl("/api/events/news"), payload, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          res = await axios.post("http://localhost:5001/api/events/news", payload, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        if (res.data.success) {
          showToast("Announcement published on Campus Feed!");
          resetModalForm();
          fetchNewsAndEvents();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to publish post.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetModalForm = () => {
    setShowPostModal(false);
    setPostTitle("");
    setPostContent("");
    setPostCategory("Announcement");
    setImageUrl("");
    setImagePreview(null);
    setEventDate("");
    setEventTime("");
    setEventVenue("");
    setEventDomain("All");
  };

  // Review Pending Event Request
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
        showToast(`Event request ${status.toLowerCase()} successfully!`);
        fetchNewsAndEvents();
      }
    } catch (err) {
      alert("Failed to update event review status.");
    }
  };

  // Delete News Post
  const handleDeleteNews = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const token = localStorage.getItem("orgAdminToken") || localStorage.getItem("adminToken");
      await axios.delete(getApiUrl(`/api/events/news/${id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Post deleted successfully.");
      fetchNewsAndEvents();
    } catch (err) {
      alert("Failed to delete post.");
    }
  };

  // Delete Event
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to remove this event?")) return;
    try {
      await axios.delete(getApiUrl(`/api/events/${eventId}`));
      showToast("Event removed successfully.");
      fetchNewsAndEvents();
    } catch (err) {
      alert("Failed to delete event.");
    }
  };

  // Like Toggle
  const toggleLike = (id) => {
    setLikedPosts((prev) => {
      const isLiked = !!prev[id];
      const nextState = { ...prev, [id]: !isLiked };
      setLikeCounts((prevCounts) => ({
        ...prevCounts,
        [id]: (prevCounts[id] || 0) + (isLiked ? -1 : 1),
      }));
      return nextState;
    });
  };

  // Attending Toggle for Events
  const toggleAttending = (id) => {
    setAttendingEvents((prev) => {
      const isAttending = !!prev[id];
      const next = { ...prev, [id]: !isAttending };
      if (!isAttending) showToast("⭐ Added to your interested events!");
      return next;
    });
  };

  // Share Post Link
  const handleSharePost = (title) => {
    navigator.clipboard?.writeText(window.location.href);
    showToast(`🔗 Link copied to clipboard for: "${title.substring(0, 25)}..."`);
  };

  // Comment Handlers
  const handleAddComment = (postId) => {
    if (!newCommentText.trim()) return;
    setCommentsMap((prev) => ({
      ...prev,
      [postId]: [
        ...(prev[postId] || []),
        {
          id: Date.now(),
          author: userName,
          role: role === "org_admin" ? "Management" : role === "domain_admin" ? "Domain Lead" : "Student",
          text: newCommentText.trim(),
          time: "Just now",
        },
      ],
    }));
    setNewCommentText("");
  };

  return (
    <div className="news-events-container with-sidebar">
      {role === "org_admin" ? (
        <OrgAdminSidebar />
      ) : role === "domain_admin" ? (
        <Sidebar />
      ) : (
        <StudentSidebar />
      )}

      <main className="news-events-content">
        {/* Toast Notification */}
        {toastMessage && <div className="linkedin-toast">{toastMessage}</div>}

        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1>📢 Campus Feed & Events</h1>
            <p>Stay updated with official announcements, achievements, and upcoming domain events.</p>
          </div>
          <div className="audience-badge">
            <span>🌐 {userDomain} Channel</span>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* LINKEDIN-STYLE "START A POST" CREATOR BAR (FOR ALL AUTHORIZED) */}
        {/* ---------------------------------------------------------------- */}
        <div className="linkedin-create-card">
          <div className="create-card-top">
            <div className="user-avatar-circle" title={userName}>
              {userInitials}
            </div>
            <button
              className="start-post-input-bar"
              onClick={() => openPostModal(role === "org_admin" ? "news" : role === "domain_admin" ? "event" : "news")}
            >
              Start a post, announcement, or event proposal...
            </button>
          </div>

          <div className="create-card-actions">
            <button className="action-btn media" onClick={() => openPostModal("news")}>
              <span className="action-icon">🖼️</span> Photo / Media
            </button>
            <button className="action-btn event" onClick={() => openPostModal("event")}>
              <span className="action-icon">🗓️</span> Campus Event
            </button>
            <button className="action-btn announcement" onClick={() => openPostModal("news")}>
              <span className="action-icon">📢</span> Announcement
            </button>
            <button className="action-btn spotlight" onClick={() => openPostModal("achievement")}>
              <span className="action-icon">🏆</span> Achievement
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* FEED CONTENT GRID */}
        {/* ---------------------------------------------------------------- */}
        {loading ? (
          <div className="linkedin-loading-card">
            <div className="spinner"></div>
            <p>Loading Campus Feed...</p>
          </div>
        ) : (
          <div className="feed-container">
            {/* -------------------------------------------------- */}
            {/* PENDING EVENT APPROVAL REQUESTS (MANAGEMENT ADMIN) */}
            {/* -------------------------------------------------- */}
            {role === "org_admin" && requests.length > 0 && (
              <div className="section-block">
                <div className="section-header-title">
                  <span>⏳ Pending Event Requests for Approval</span>
                  <span className="badge-count-orange">{requests.length} Pending</span>
                </div>

                <div className="requests-grid">
                  {requests.map((reqItem) => (
                    <div key={reqItem.id} className="linkedin-post-card pending-card">
                      <div className="card-top-bar">
                        <div className="author-info">
                          <div className="user-avatar-circle mini">AD</div>
                          <div>
                            <h4 className="author-name">{reqItem.organizer}</h4>
                            <p className="author-role">{reqItem.domain} Lead • Proposed Event</p>
                          </div>
                        </div>
                        <span className="status-badge-orange">Pending Review</span>
                      </div>

                      <h3 className="post-title">{reqItem.title}</h3>
                      <p className="post-body">{reqItem.description}</p>

                      <div className="event-meta-pill-grid">
                        <span>📍 {reqItem.domain}</span>
                        <span>📅 {reqItem.eventDate}</span>
                        <span>⏰ {reqItem.eventTime}</span>
                        <span>🏢 {reqItem.venue}</span>
                      </div>

                      <div className="card-actions-row">
                        <button
                          className="btn-linkedin-approve"
                          onClick={() => handleReviewRequest(reqItem.eventId, "Approved")}
                        >
                          ✅ Approve & Publish
                        </button>
                        <button
                          className="btn-linkedin-reject"
                          onClick={() => handleReviewRequest(reqItem.eventId, "Rejected")}
                        >
                          ❌ Reject Proposal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* -------------------------------------------------- */}
            {/* MAIN CAMPUS FEED (NEWS & EVENTS INTEGRATED FEED) */}
            {/* -------------------------------------------------- */}
            <div className="section-header-title" style={{ marginTop: "12px" }}>
              <span>📰 Official Campus Feed</span>
              <span className="badge-count-blue">{news.length + events.filter((e) => e.status === "Approved").length} Posts</span>
            </div>

            {news.length === 0 && events.length === 0 ? (
              <div className="empty-feed-card">
                <p>📢 No announcements or events posted yet.</p>
                <p>Click <strong>"Start a post"</strong> above to share the first announcement!</p>
              </div>
            ) : (
              <div className="linkedin-feed-list">
                {/* 1. News & Announcements Posts */}
                {news.map((n) => (
                  <div key={n.id} className="linkedin-post-card">
                    {/* Author Header */}
                    <div className="card-top-bar">
                      <div className="author-info">
                        <div className="user-avatar-circle org">MA</div>
                        <div>
                          <div className="author-name-row">
                            <h4 className="author-name">{n.postedBy || "Management Admin"}</h4>
                            <span className="verified-badge">✓ Official</span>
                          </div>
                          <p className="author-role">Organisation Admin • Campus Management</p>
                          <span className="post-timestamp">{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="card-header-right">
                        <span className="post-category-tag">{n.category || "Announcement"}</span>
                        {role === "org_admin" && (
                          <button
                            className="btn-icon-delete"
                            onClick={() => handleDeleteNews(n.id)}
                            title="Delete Post"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="post-content-area">
                      <h3 className="post-title">{n.title}</h3>
                      <p className="post-body">{n.content}</p>

                      {/* Attached Image */}
                      {n.imageUrl && (
                        <div className="post-image-container">
                          <img src={n.imageUrl} alt={n.title} className="post-attached-image" />
                        </div>
                      )}
                    </div>

                    {/* Engagement Counts Bar */}
                    <div className="engagement-summary-bar">
                      <span className="like-count-label">
                        👍 {(likeCounts[n.id] || 0) + 12} Likes
                      </span>
                      <span className="comment-count-label">
                        💬 {(commentsMap[n.id] || []).length} Comments
                      </span>
                    </div>

                    {/* LinkedIn Footer Action Buttons */}
                    <div className="card-footer-buttons">
                      <button
                        className={`footer-action-btn ${likedPosts[n.id] ? "liked" : ""}`}
                        onClick={() => toggleLike(n.id)}
                      >
                        👍 {likedPosts[n.id] ? "Liked" : "Like"}
                      </button>

                      <button
                        className="footer-action-btn"
                        onClick={() => setActiveCommentPost(activeCommentPost === n.id ? null : n.id)}
                      >
                        💬 Comment
                      </button>

                      <button className="footer-action-btn" onClick={() => handleSharePost(n.title)}>
                        📤 Share
                      </button>
                    </div>

                    {/* Expandable Comment Drawer */}
                    {activeCommentPost === n.id && (
                      <div className="comment-drawer">
                        <div className="comment-input-row">
                          <input
                            type="text"
                            className="comment-text-input"
                            placeholder="Add a comment..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddComment(n.id)}
                          />
                          <button className="btn-comment-send" onClick={() => handleAddComment(n.id)}>
                            Post
                          </button>
                        </div>

                        <div className="comments-list">
                          {(commentsMap[n.id] || []).map((c) => (
                            <div key={c.id} className="comment-item">
                              <div className="comment-author-bar">
                                <span className="comment-author">{c.author}</span>
                                <span className="comment-role-tag">{c.role}</span>
                              </div>
                              <p className="comment-text">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* 2. Events Posts */}
                {events
                  .filter((e) => e.status === "Approved" || role === "org_admin" || e.organizer === userName)
                  .map((evt) => (
                    <div key={evt.id} className="linkedin-post-card event-post">
                      {/* Author Header */}
                      <div className="card-top-bar">
                        <div className="author-info">
                          <div className="user-avatar-circle domain">
                            {getInitials(evt.organizer || "Domain Admin")}
                          </div>
                          <div>
                            <div className="author-name-row">
                              <h4 className="author-name">{evt.organizer}</h4>
                              <span className="domain-pill">{evt.domain}</span>
                            </div>
                            <p className="author-role">Event Organizer • {evt.domain}</p>
                            <span className="post-timestamp">{evt.eventDate}</span>
                          </div>
                        </div>

                        <div className="card-header-right">
                          <span
                            className={`status-pill ${
                              evt.status === "Approved"
                                ? "approved"
                                : evt.status === "Rejected"
                                ? "rejected"
                                : "pending"
                            }`}
                          >
                            {evt.status}
                          </span>
                          {(role === "org_admin" || evt.organizer === userName) && (
                            <button
                              className="btn-icon-delete"
                              onClick={() => handleDeleteEvent(evt.eventId)}
                              title="Delete Event"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Event Banner Card */}
                      <div className="linkedin-event-banner-card">
                        <div className="event-date-badge">
                          <span className="date-month">
                            {new Date(evt.eventDate).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                          </span>
                          <span className="date-day">{new Date(evt.eventDate).getDate() || "15"}</span>
                        </div>

                        <div className="event-details-column">
                          <h3 className="event-banner-title">{evt.title}</h3>
                          <p className="event-banner-meta">
                            ⏰ {evt.eventTime || "10:00 AM - 4:00 PM"} | 🏢 {evt.venue || "Campus Auditorium"}
                          </p>
                          <p className="event-banner-domain">📍 Targeted Domain: {evt.domain}</p>
                        </div>

                        <button
                          className={`btn-attend-toggle ${attendingEvents[evt.id] ? "attending" : ""}`}
                          onClick={() => toggleAttending(evt.id)}
                        >
                          {attendingEvents[evt.id] ? "✅ Attending" : "⭐ Interested"}
                        </button>
                      </div>

                      {/* Event Description */}
                      <div className="post-content-area">
                        <p className="post-body">{evt.description}</p>
                        {evt.imageUrl && (
                          <div className="post-image-container">
                            <img src={evt.imageUrl} alt={evt.title} className="post-attached-image" />
                          </div>
                        )}
                      </div>

                      {/* Engagement Counts Bar */}
                      <div className="engagement-summary-bar">
                        <span className="like-count-label">
                          ⭐ {(likeCounts[evt.id] || 0) + 18} Interested
                        </span>
                        <span className="comment-count-label">
                          💬 {(commentsMap[evt.id] || []).length} Comments
                        </span>
                      </div>

                      {/* LinkedIn Action Buttons */}
                      <div className="card-footer-buttons">
                        <button
                          className={`footer-action-btn ${likedPosts[evt.id] ? "liked" : ""}`}
                          onClick={() => toggleLike(evt.id)}
                        >
                          👍 {likedPosts[evt.id] ? "Liked" : "Like"}
                        </button>

                        <button
                          className="footer-action-btn"
                          onClick={() => setActiveCommentPost(activeCommentPost === evt.id ? null : evt.id)}
                        >
                          💬 Comment
                        </button>

                        <button className="footer-action-btn" onClick={() => handleSharePost(evt.title)}>
                          📤 Share
                        </button>
                      </div>

                      {/* Expandable Comment Drawer */}
                      {activeCommentPost === evt.id && (
                        <div className="comment-drawer">
                          <div className="comment-input-row">
                            <input
                              type="text"
                              className="comment-text-input"
                              placeholder="Add a comment or query..."
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddComment(evt.id)}
                            />
                            <button className="btn-comment-send" onClick={() => handleAddComment(evt.id)}>
                              Post
                            </button>
                          </div>

                          <div className="comments-list">
                            {(commentsMap[evt.id] || []).map((c) => (
                              <div key={c.id} className="comment-item">
                                <div className="comment-author-bar">
                                  <span className="comment-author">{c.author}</span>
                                  <span className="comment-role-tag">{c.role}</span>
                                </div>
                                <p className="comment-text">{c.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* LINKEDIN-STYLE POST CREATION MODAL */}
      {/* ---------------------------------------------------------------- */}
      {showPostModal && (
        <div className="linkedin-modal-overlay">
          <div className="linkedin-modal-box">
            {/* Modal Header */}
            <div className="linkedin-modal-header">
              <div className="modal-user-identity">
                <div className="user-avatar-circle large">{userInitials}</div>
                <div>
                  <h3 className="modal-user-name">{userName}</h3>
                  <div className="modal-audience-pill">
                    <select
                      className="audience-select"
                      value={postAudience}
                      onChange={(e) => setPostAudience(e.target.value)}
                    >
                      <option value="Anyone (Campus)">🌐 Anyone (Campus Feed)</option>
                      <option value="Domain Members Only">🔒 {userDomain} Only</option>
                    </select>
                  </div>
                </div>
              </div>
              <button className="linkedin-modal-close" onClick={resetModalForm}>
                ✕
              </button>
            </div>

            {/* Post Type Selector Tabs */}
            <div className="linkedin-type-tabs">
              <button
                type="button"
                className={`tab-btn ${postType === "news" ? "active" : ""}`}
                onClick={() => setPostType("news")}
              >
                📢 Announcement
              </button>
              <button
                type="button"
                className={`tab-btn ${postType === "event" ? "active" : ""}`}
                onClick={() => setPostType("event")}
              >
                🗓️ Campus Event
              </button>
              <button
                type="button"
                className={`tab-btn ${postType === "achievement" ? "active" : ""}`}
                onClick={() => setPostType("achievement")}
              >
                💡 Achievement
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPost} className="linkedin-modal-form">
              {/* Post Title */}
              <input
                type="text"
                className="linkedin-title-input"
                placeholder={
                  postType === "event"
                    ? "Event Title (e.g. AI & Web3 Hackathon 2026)"
                    : "Post Headline / Title..."
                }
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                required
              />

              {/* Main Content Textarea */}
              <textarea
                className="linkedin-content-textarea"
                rows="5"
                placeholder={
                  postType === "event"
                    ? "Describe event details, eligibility, schedule, registration link..."
                    : "What do you want to talk about? (e.g. #KGKITE, #Announcement, #Placement)..."
                }
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                required
              ></textarea>

              {/* Emoji Quick-Bar */}
              <div className="emoji-quick-bar">
                <span className="emoji-label">Add Emoji:</span>
                {["🎉", "📢", "🚀", "💡", "🔥", "🎓", "🏆", "📌", "💻", "⭐"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="emoji-btn"
                    onClick={() => addEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Event Specification Inputs (When Event Tab Active) */}
              {postType === "event" && (
                <div className="event-fields-box">
                  <h4 className="box-title">🗓️ Event Schedule & Venue Details</h4>
                  <div className="fields-grid">
                    <div className="input-group">
                      <label>Event Date *</label>
                      <input
                        type="date"
                        className="modal-field-input"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="input-group">
                      <label>Event Time</label>
                      <input
                        type="text"
                        className="modal-field-input"
                        placeholder="e.g. 10:00 AM - 4:00 PM"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                      />
                    </div>

                    <div className="input-group">
                      <label>Venue / Location</label>
                      <input
                        type="text"
                        className="modal-field-input"
                        placeholder="e.g. Main Auditorium / Lab 3"
                        value={eventVenue}
                        onChange={(e) => setEventVenue(e.target.value)}
                      />
                    </div>

                    <div className="input-group">
                      <label>Target Domain</label>
                      <input
                        type="text"
                        className="modal-field-input"
                        value={role === "domain_admin" ? userDomain : eventDomain}
                        onChange={(e) => setEventDomain(e.target.value)}
                        disabled={role === "domain_admin"}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Image / Photo Attachment */}
              <div className="image-attachment-box">
                <label className="attachment-label">📷 Attach Banner Image (Optional)</label>
                <div className="attachment-inputs">
                  <input
                    type="file"
                    accept="image/*"
                    className="file-picker-input"
                    onChange={handleImageFileChange}
                  />
                  <span className="or-text">or paste URL:</span>
                  <input
                    type="text"
                    className="url-input"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                  />
                </div>

                {imagePreview && (
                  <div className="image-preview-wrapper">
                    <img src={imagePreview} alt="Preview" className="modal-image-preview" />
                    <button
                      type="button"
                      className="btn-remove-image"
                      onClick={() => {
                        setImagePreview(null);
                        setImageUrl("");
                      }}
                    >
                      ✕ Remove Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Category Tag Selector */}
              {postType !== "event" && (
                <div className="category-picker">
                  <label className="picker-label">🏷️ Category Tag:</label>
                  <div className="category-pills">
                    {["Announcement", "Important Notice", "Achievement", "General"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`cat-pill ${postCategory === cat ? "selected" : ""}`}
                        onClick={() => setPostCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="linkedin-modal-footer">
                <div className="footer-left-notes">
                  {role === "domain_admin" && postType === "event" && (
                    <span className="approval-note">
                      ⚠️ Note: Event proposal will be sent for Management approval.
                    </span>
                  )}
                </div>

                <div className="footer-right-buttons">
                  <button type="button" className="btn-modal-cancel" onClick={resetModalForm}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-modal-post"
                    disabled={submitting || !postTitle.trim() || !postContent.trim()}
                  >
                    {submitting
                      ? "Publishing..."
                      : postType === "event"
                      ? role === "org_admin"
                        ? "Publish Event"
                        : "Submit Event Proposal"
                      : "Post"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewsEvents;
