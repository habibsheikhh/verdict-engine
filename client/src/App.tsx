import React, { useState, useEffect } from "react";
import { User } from "./types";
import { api } from "./api";
import { Navbar } from "./components/Navbar";
import { ProblemList } from "./components/ProblemList";
import { ProblemDetail } from "./components/ProblemDetail";
import { AuthModal } from "./components/AuthModal";
import { ErrorBoundary } from "./components/ErrorBoundary";

const getHashSlug = (): string | null => {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#\/?/, "").trim();
  return hash || null;
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedProblemSlug, setSelectedProblemSlug] = useState<string | null>(getHashSlug);

  useEffect(() => {
    let mounted = true;

    // Check if user is already authenticated
    api
      .getMe()
      .then((user) => {
        if (mounted && user) setCurrentUser(user);
      })
      .catch(() => {});

    // Listen to hash changes for deep linking and browser Back/Forward navigation
    const handleHashChange = () => {
      const slug = getHashSlug();
      setSelectedProblemSlug((prev) => (prev !== slug ? slug : prev));
    };

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);

    return () => {
      mounted = false;
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  const handleSelectProblem = (slug: string) => {
    setSelectedProblemSlug(slug);
    if (window.location.hash !== `#${slug}` && window.location.hash !== slug) {
      window.location.hash = slug;
    }
  };

  const handleNavigateHome = () => {
    setSelectedProblemSlug(null);
    if (window.location.hash && window.location.hash !== "#") {
      history.pushState(null, "", window.location.pathname);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  return (
    <ErrorBoundary fallbackTitle="Platform Shell Error">
      <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-[#ededef]">
        <Navbar
          user={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          onNavigateHome={handleNavigateHome}
        />

        <main className="flex-1">
          {selectedProblemSlug ? (
            <ErrorBoundary
              onReset={handleNavigateHome}
              fallbackTitle="Workspace Render Failed"
            >
              <ProblemDetail
                slug={selectedProblemSlug}
                user={currentUser}
                onOpenAuth={() => setIsAuthOpen(true)}
                onBack={handleNavigateHome}
              />
            </ErrorBoundary>
          ) : (
            <ErrorBoundary fallbackTitle="Problem Explorer Error">
              <ProblemList onSelectProblem={handleSelectProblem} />
            </ErrorBoundary>
          )}
        </main>

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={(user) => setCurrentUser(user)}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
