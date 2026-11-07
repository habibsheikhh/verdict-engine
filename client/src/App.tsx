import React, { useState, useEffect } from "react";
import { User } from "./types";
import { api } from "./api";
import { Navbar } from "./components/Navbar";
import { ProblemList } from "./components/ProblemList";
import { ProblemDetail } from "./components/ProblemDetail";
import { AuthModal } from "./components/AuthModal";

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedProblemSlug, setSelectedProblemSlug] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    api.getMe().then((user) => {
      if (user) setCurrentUser(user);
    });

    // Check URL query param or hash for deep linking (e.g. #two-sum)
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setSelectedProblemSlug(hash);
    }
  }, []);

  const handleSelectProblem = (slug: string) => {
    setSelectedProblemSlug(slug);
    window.location.hash = slug;
  };

  const handleNavigateHome = () => {
    setSelectedProblemSlug(null);
    window.location.hash = "";
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar
        user={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onNavigateHome={handleNavigateHome}
      />

      <main className="flex-1">
        {selectedProblemSlug ? (
          <ProblemDetail
            slug={selectedProblemSlug}
            user={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
            onBack={handleNavigateHome}
          />
        ) : (
          <ProblemList onSelectProblem={handleSelectProblem} />
        )}
      </main>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
};

export default App;

