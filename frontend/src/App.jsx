import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AdminLogin from "./pages/AdminLogin";
import OrgAdminLogin from "./pages/OrgAdminLogin";
import OrgAdminDashboard from "./pages/OrgAdminDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Attendance from "./pages/Attendance";
import Tasks from "./pages/Tasks";
import StudentData from "./pages/StudentData";
import StudentProfile from "./pages/StudentProfile";
import AdminManagement from "./pages/AdminManagement";
import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";

import OrgAdminTasks from "./pages/OrgAdminTasks";

// Route Guard for Management / Org Admin pages
function OrgAdminRoute({ children }) {
  const token = localStorage.getItem("orgAdminToken") || localStorage.getItem("adminToken");
  const adminData = localStorage.getItem("admin");

  if (!token || !adminData) {
    return <Navigate to="/org-admin/login" replace />;
  }

  try {
    const admin = JSON.parse(adminData);
    if (admin.role !== "org_admin") {
      return <Navigate to="/org-admin/login" replace />;
    }
  } catch (e) {
    return <Navigate to="/org-admin/login" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to="/student/login"
              replace
            />
          }
        />

        {/* Login Portals */}
        <Route
          path="/student/login"
          element={<StudentLogin />}
        />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/org-admin/login"
          element={<OrgAdminLogin />}
        />

        {/* Management Portal Exclusive Routes */}
        <Route
          path="/org-admin/dashboard"
          element={
            <OrgAdminRoute>
              <OrgAdminDashboard />
            </OrgAdminRoute>
          }
        />

        <Route
          path="/org-admin/manage-admins"
          element={
            <OrgAdminRoute>
              <AdminManagement />
            </OrgAdminRoute>
          }
        />

        <Route
          path="/org-admin/attendance"
          element={
            <OrgAdminRoute>
              <Attendance />
            </OrgAdminRoute>
          }
        />

        <Route
          path="/org-admin/students"
          element={
            <OrgAdminRoute>
              <StudentData />
            </OrgAdminRoute>
          }
        />

        <Route
          path="/org-admin/master-data"
          element={
            <Navigate to="/org-admin/students" replace />
          }
        />

        <Route
          path="/org-admin/tasks"
          element={
            <OrgAdminRoute>
              <OrgAdminTasks />
            </OrgAdminRoute>
          }
        />

        <Route
          path="/admin/manage-admins"
          element={
            <Navigate to="/org-admin/manage-admins" replace />
          }
        />

        {/* Student View */}
        <Route
          path="/student/dashboard"
          element={<StudentDashboard />}
        />

        {/* Domain Admin Views */}
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/students"
          element={<StudentData />}
        />

        <Route
          path="/admin/students/:studentId"
          element={<StudentProfile />}
        />

        <Route
          path="/admin/attendance"
          element={<Attendance />}
        />

        <Route
          path="/admin/tasks"
          element={<Tasks />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/admin/login"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;