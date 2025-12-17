import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

import Home from "@/pages/Home";
import Payments from "@/pages/Payments";
import Dashboard from "@/pages/Dashboard";
import OauthHandler from "@/pages/OauthHandler";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailure from "@/pages/PaymentFailure";
import AuthPage from "@/pages/AuthPage";

import ProjectsHub from "@/pages/projects/ProjectsHub";
import CreateProjectWizard from "@/pages/projects/CreateProjectWizard";

function App() {
  return (
    <Router>
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pt-[120px]">
        <Navbar />

        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />
          <Route path="/oauth" element={<OauthHandler />} />

          {/* Payment Redirects */}
          <Route path="/payments/success" element={<PaymentSuccess />} />
          <Route path="/payments/failure" element={<PaymentFailure />} />

          {/* Protected */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* ✅ PROJECTS HUB (PARENT ROUTE) */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsHub />
              </ProtectedRoute>
            }
          >
            {/* Default empty state */}
            <Route
              index
              element={
                <div className="flex items-center justify-center h-full text-gray-400">
                  Select a project to continue
                </div>
              }
            />

            {/* Project dashboard */}
            <Route path=":projectId" element={<Dashboard />} />

            {/* Create project wizard */}
            <Route path="create" element={<CreateProjectWizard />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
