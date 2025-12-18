import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

import Home from "@/pages/Home";
import Payments from "@/pages/Payments";
import Dashboard from "@/pages/Dashboard"; // GLOBAL dashboard
import OauthHandler from "@/pages/OauthHandler";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailure from "@/pages/PaymentFailure";
import AuthPage from "@/pages/AuthPage";

// Projects
import ProjectsHub from "@/pages/projects/ProjectsHub";
import CreateProjectWizard from "@/pages/projects/CreateProjectWizard";

// Project workspace
import ProjectLayout from "@/layouts/ProjectLayout";
import ProjectDashboard from "@/pages/project-workspace/Dashboard";
import TestPayment from "@/pages/project-workspace/TestPayment";

function App() {
  return (
    <Router>
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pt-[120px]">
        <Navbar />

        <Routes>
          {/* ================= PUBLIC ================= */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />
          <Route path="/oauth" element={<OauthHandler />} />

          {/* ================= PAYMENT REDIRECTS ================= */}
          <Route path="/payments/success" element={<PaymentSuccess />} />
          <Route path="/payments/failure" element={<PaymentFailure />} />

          {/* ================= GLOBAL PROTECTED ================= */}
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

          {/* ================= PROJECTS ================= */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsHub />
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects/create"
            element={
              <ProtectedRoute>
                <CreateProjectWizard />
              </ProtectedRoute>
            }
          />

          {/* ================= PROJECT WORKSPACE ================= */}
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <ProjectLayout />
              </ProtectedRoute>
            }
          >
            {/* Default = dashboard */}
            <Route index element={<ProjectDashboard />} />

            {/* Test payment */}
            <Route path="test-payment" element={<TestPayment />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
