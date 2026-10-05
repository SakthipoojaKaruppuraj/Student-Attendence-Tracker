import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Attendance from "./pages/Attendance";
import Tasks from "./pages/Tasks";
import StudentData from "./pages/StudentData";
import StudentProfile from "./pages/StudentProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={
            <Navigate
              to="/admin/login"
              replace
            />
          }
        />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

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