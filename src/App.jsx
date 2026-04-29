import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./services/queryClient";
import { useAuth } from "./hooks/useAuth";
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";
import Modal from "./shared/Modal";
import ToastContainer from "./shared/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/main.css";

const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const SignupPage = lazy(() => import("./features/auth/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./features/auth/ForgotPasswordPage"));
const DashboardPage = lazy(() => import("./features/dashboard/DashboardPage"));
const AnalyzePage = lazy(() => import("./features/analyzer/AnalyzePage"));
const ReportPage = lazy(() => import("./features/report/ReportPage"));
const ComparePage = lazy(() => import("./features/compare/ComparePage"));
const AdminPanel = lazy(() => import("./features/admin/AdminPanel"));
const SharePage = lazy(() => import("./features/report/SharePage"));
const ApiKeysPage = lazy(() => import("./features/developer/ApiKeysPage"));

function PageLoader() {
  return (
    <div className="page-loader" aria-label="Loading page" role="status">
      <div className="page-loader-spinner" />
    </div>
  );
}

function ProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAuth();
  if (!isInitialized) return <PageLoader />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth/login" replace />;
}

function AdminRoute() {
  const { isAdmin, isInitialized } = useAuth();
  if (!isInitialized) return <PageLoader />;
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function GuestRoute() {
  const { isAuthenticated, isInitialized } = useAuth();
  if (!isInitialized) return <PageLoader />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function AppBootstrapper({ children }) {
  const { fetchMe } = useAuth();
  useEffect(() => { fetchMe(); }, [fetchMe]);
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <AppBootstrapper>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                <Route element={<GuestRoute />}>
                  <Route element={<AuthLayout><Outlet /></AuthLayout>}>
                    <Route path="/auth/login" element={<LoginPage />} />
                    <Route path="/auth/signup" element={<SignupPage />} />
                    <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                  </Route>
                </Route>

                <Route path="/share/:token" element={<SharePage />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout><Outlet /></AppLayout>}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/analyze" element={<AnalyzePage />} />
                    <Route path="/reports/:id" element={<ReportPage />} />
                    <Route path="/compare" element={<ComparePage />} />
                    <Route path="/developer" element={<ApiKeysPage />} />
                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<AdminPanel />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>

            <ToastContainer />
            <Modal />
          </AppBootstrapper>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
