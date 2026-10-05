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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/attendance" element={<Attendance />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/tasks" element={<Tasks />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;