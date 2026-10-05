import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Tasks.css";

const API_URL = "http://localhost:5001/api/tasks";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    domain: "",
    year: "",
    due_date: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // -----------------------------------------
  // LOAD TASKS
  // -----------------------------------------

  const fetchTasks = async () => {
    try {
      const response = await axios.get(API_URL);

      if (response.data.success) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      setError("Unable to load tasks.");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // -----------------------------------------
  // FORM HANDLING
  // -----------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // -----------------------------------------
  // CREATE TASK
  // -----------------------------------------

  const handleCreateTask = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const adminData = localStorage.getItem("admin");

      let createdBy = "admin";

      if (adminData) {
        const admin = JSON.parse(adminData);
        createdBy = admin.username || "admin";
      }

      const response = await axios.post(API_URL, {
        ...formData,
        created_by: createdBy,
      });

      if (response.data.success) {
        setMessage("Task created successfully.");

        setFormData({
          title: "",
          description: "",
          domain: "",
          year: "",
          due_date: "",
        });

        setShowForm(false);

        fetchTasks();
      }
    } catch (error) {
      console.error("Create task error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to create task."
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------
  // DELETE TASK
  // -----------------------------------------

  const handleDelete = async (taskId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/${taskId}`
      );

      setMessage("Task deleted successfully.");

      fetchTasks();
    } catch (error) {
      console.error("Delete task error:", error);

      setError("Unable to delete task.");
    }
  };

  // -----------------------------------------
  // FILTER TASKS
  // -----------------------------------------

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      task.description
        ?.toLowerCase()
        .includes(search.toLowerCase());

    const matchesDomain =
      domainFilter === "All" ||
      task.domain === domainFilter;

    const matchesYear =
      yearFilter === "All" ||
      task.year === yearFilter;

    return (
      matchesSearch &&
      matchesDomain &&
      matchesYear
    );
  });

  // -----------------------------------------
  // STATISTICS
  // -----------------------------------------

  const totalTasks = tasks.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openTasks = tasks.filter(
    (task) =>
      new Date(task.due_date) >= today
  ).length;

  const dueSoonTasks = tasks.filter((task) => {
    const dueDate = new Date(task.due_date);

    const difference =
      (dueDate - today) /
      (1000 * 60 * 60 * 24);

    return difference >= 0 && difference <= 3;
  }).length;

  const domains = [
    ...new Set(
      tasks
        .map((task) => task.domain)
        .filter(Boolean)
    ),
  ];

  // -----------------------------------------
  // RENDER
  // -----------------------------------------

  return (
    <div className="tasks-page">

      {/* HEADER */}

      <div className="tasks-header">

        <div>
          <h1>Everyday Tasks</h1>

          <p>
            Create and manage daily tasks
            for students.
          </p>
        </div>

        <button
          className="create-task-button"
          onClick={() => {
            setShowForm(!showForm);
            setMessage("");
            setError("");
          }}
        >
          {showForm
            ? "✕ Close"
            : "+ Create Task"}
        </button>

      </div>

      {/* MESSAGES */}

      {message && (
        <div className="success-message">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="error-message">
          ⚠ {error}
        </div>
      )}

      {/* STATISTICS */}

      <div className="task-statistics">

        <div className="task-stat-card">
          <div className="stat-icon">📋</div>

          <div>
            <span>Total Tasks</span>
            <strong>{totalTasks}</strong>
          </div>
        </div>

        <div className="task-stat-card">
          <div className="stat-icon">🟢</div>

          <div>
            <span>Open Tasks</span>
            <strong>{openTasks}</strong>
          </div>
        </div>

        <div className="task-stat-card">
          <div className="stat-icon">⏰</div>

          <div>
            <span>Due Soon</span>
            <strong>{dueSoonTasks}</strong>
          </div>
        </div>

      </div>

      {/* CREATE TASK FORM */}

      {showForm && (
        <div className="task-form-card">

          <div className="form-card-header">
            <div>
              <h2>Create New Task</h2>

              <p>
                Add an everyday task for
                students.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleCreateTask}
          >

            <div className="form-group">
              <label>
                Task Title *
              </label>

              <input
                type="text"
                name="title"
                placeholder="Enter task title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>
                Task Description *
              </label>

              <textarea
                name="description"
                placeholder="Describe what the student needs to complete..."
                value={formData.description}
                onChange={handleChange}
                rows="5"
                required
              />
            </div>

            <div className="form-row">

              <div className="form-group">
                <label>
                  Domain *
                </label>

                <select
                  name="domain"
                  value={formData.domain}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select Domain
                  </option>

                  <option value="Blockchain">
                    Blockchain
                  </option>

                  <option value="AI / ML">
                    AI / ML
                  </option>

                  <option value="Data Science">
                    Data Science
                  </option>

                  <option value="Web Development">
                    Web Development
                  </option>

                  <option value="Cyber Security">
                    Cyber Security
                  </option>

                  <option value="Cloud">
                    Cloud
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  Year *
                </label>

                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select Year
                  </option>

                  <option value="2nd Year">
                    2nd Year
                  </option>

                  <option value="3rd Year">
                    3rd Year
                  </option>

                  <option value="4th Year">
                    4th Year
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  Due Date *
                </label>

                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  required
                />
              </div>

            </div>

            <div className="form-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setShowForm(false)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="submit-task-button"
                disabled={loading}
              >
                {loading
                  ? "Creating..."
                  : "Create Task"}
              </button>

            </div>

          </form>

        </div>
      )}

      {/* FILTERS */}

      <div className="task-controls">

        <div className="search-container">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <select
          value={domainFilter}
          onChange={(event) =>
            setDomainFilter(event.target.value)
          }
        >
          <option value="All">
            All Domains
          </option>

          {domains.map((domain) => (
            <option
              key={domain}
              value={domain}
            >
              {domain}
            </option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(event) =>
            setYearFilter(event.target.value)
          }
        >
          <option value="All">
            All Years
          </option>

          <option value="2nd Year">
            2nd Year
          </option>

          <option value="3rd Year">
            3rd Year
          </option>

          <option value="4th Year">
            4th Year
          </option>
        </select>

      </div>

      {/* TASK LIST */}

      <div className="tasks-card">

        <div className="tasks-card-header">

          <div>
            <h2>Task List</h2>

            <p>
              {filteredTasks.length} task
              {filteredTasks.length !== 1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>

        </div>

        {filteredTasks.length === 0 ? (

          <div className="empty-tasks">

            <div className="empty-icon">
              📋
            </div>

            <h3>No tasks found</h3>

            <p>
              Create your first everyday
              task to get started.
            </p>

          </div>

        ) : (

          <div className="task-list">

            {filteredTasks.map((task) => {

              const dueDate =
                new Date(task.due_date);

              const formattedDate =
                dueDate.toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                );

              const isOverdue =
                dueDate < today;

              return (
                <div
                  className="task-item"
                  key={task.task_id}
                >

                  <div className="task-main">

                    <div className="task-title-row">

                      <h3>
                        {task.title}
                      </h3>

                      <span
                        className={
                          isOverdue
                            ? "task-status overdue"
                            : "task-status open"
                        }
                      >
                        {isOverdue
                          ? "Overdue"
                          : "Open"}
                      </span>

                    </div>

                    <p className="task-description">
                      {task.description}
                    </p>

                    <div className="task-meta">

                      <span>
                        🏢 {task.domain}
                      </span>

                      <span>
                        🎓 {task.year}
                      </span>

                      <span
                        className={
                          isOverdue
                            ? "due-date overdue-text"
                            : "due-date"
                        }
                      >
                        📅 Due:{" "}
                        {formattedDate}
                      </span>

                    </div>

                  </div>

                  <div className="task-actions">

                    <button
                      className="view-button"
                      onClick={() =>
                        alert(
                          `Task ID: ${task.task_id}\n\n${task.description}`
                        )
                      }
                    >
                      View
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        handleDelete(
                          task.task_id
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>
              );
            })}

          </div>

        )}

      </div>

    </div>
  );
}

export default Tasks;