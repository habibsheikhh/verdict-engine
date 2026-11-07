import React from "react";
import { User } from "../types";
import { Terminal, LogOut, User as UserIcon, Shield } from "lucide-react";

interface NavbarProps {
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onLogout,
  onNavigateHome,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-6">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-white font-bold text-lg hover:opacity-90 transition-opacity"
        >
          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Terminal size={18} />
          </div>
          <span className="tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            OJ Platform
          </span>
        </button>

        <nav className="flex items-center gap-4 text-sm font-medium">
          <button
            onClick={onNavigateHome}
            className="text-slate-300 hover:text-white transition-colors"
          >
            Problems
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-full px-3 py-1 text-xs text-slate-300">
              <UserIcon size={13} className="text-emerald-400" />
              <span>{user.name}</span>
              {user.role === "ADMIN" && (
                <span className="flex items-center gap-0.5 bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.5 rounded text-[10px]">
                  <Shield size={10} />
                  ADMIN
                </span>
              )}
            </div>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 transition-colors shadow-md shadow-emerald-950"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};

