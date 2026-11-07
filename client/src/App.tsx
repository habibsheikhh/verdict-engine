import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  Outlet,
} from "react-router-dom";
import { User } from "./types";
import { api } from "./api";
import { Navbar } from "./components/Navbar";
import { ProblemList } from "./components/ProblemList";
import { ProblemDetail } from "./components/ProblemDetail";
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ---------------------------------------------------------------------------
// Route Wrapper for Problem Detail
// ---------------------------------------------------------------------------
interface ProblemDetailRouteProps {
  user: User | null;
  onOpenAuth: () => void;
  onBack: () => void;
}

const ProblemDetailRoute: React.FC<ProblemDetailRouteProps> = ({
  user,
  onOpenAuth,
  onBack,
}) => {
  const { slug } = useParams<{ slug: string }>();

  return (
    <ErrorBoundary onReset={onBack} fallbackTitle="Workspace Render Failed">
      <ProblemDetail
        slug={slug || ""}
        user={user}
        onOpenAuth={onOpenAuth}
        onBack={onBack}
      />
    </ErrorBoundary>
  );
};

// ---------------------------------------------------------------------------
// Platform Layout: Strict wrapper that mounts Navbar ONLY for problem routes
// ---------------------------------------------------------------------------
interface PlatformLayoutProps {
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateLanding: () => void;
}

const PlatformLayout: React.FC<PlatformLayoutProps> = ({
  user,
  onOpenAuth,
  onLogout,
  onNavigateHome,
  onNavigateLanding,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-[#ededef]">
      <Navbar
        user={user}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        onNavigateHome={onNavigateHome}
        onNavigateLanding={onNavigateLanding}
      />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Router Application Content
// ---------------------------------------------------------------------------
const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // Check existing auth session
    api
      .getMe()
      .then((user) => {
        if (mounted && user) setCurrentUser(user);
      })
      .catch(() => {});

    // Seamless migration for legacy hash URLs (e.g. #two-sum -> /problems/two-sum)
    const hash = window.location.hash.replace(/^#\/?/, "").trim();
    if (hash && !window.location.pathname.startsWith("/problems/")) {
      window.location.hash = "";
      navigate(`/problems/${hash}`, { replace: true });
    }

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  return (
    <Routes>
      {/* 1. Landing Page: Completely bare, ZERO top navigation elements */}
      <Route
        path="/"
        element={
          <ErrorBoundary fallbackTitle="Landing Page Error">
            <LandingPage user={currentUser} />
          </ErrorBoundary>
        }
      />

      {/* 2. Authentication Page: Dedicated centered card, ZERO navbar */}
      <Route
        path="/login"
        element={
          <ErrorBoundary fallbackTitle="Authentication Error">
            <AuthPage onSuccess={(user) => setCurrentUser(user)} />
          </ErrorBoundary>
        }
      />

      {/* 3. Platform Shell: Navbar is mounted ONLY for /problems and /problems/:slug */}
      <Route
        element={
          <PlatformLayout
            user={currentUser}
            onOpenAuth={() => navigate("/login")}
            onLogout={handleLogout}
            onNavigateHome={() => navigate("/problems")}
            onNavigateLanding={() => navigate("/")}
          />
        }
      >
        <Route
          path="/problems"
          element={
            <ErrorBoundary fallbackTitle="Problem Explorer Error">
              <ProblemList
                onSelectProblem={(slug) => navigate(`/problems/${slug}`)}
              />
            </ErrorBoundary>
          }
        />
        <Route
          path="/problems/:slug"
          element={
            <ProblemDetailRoute
              user={currentUser}
              onOpenAuth={() => navigate("/login")}
              onBack={() => navigate("/problems")}
            />
          }
        />
      </Route>

      {/* Fallback Catch-all: Redirect unknown routes back to Landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Application Shell Error">
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
