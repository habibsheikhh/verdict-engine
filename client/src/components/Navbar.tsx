import React, { useState } from "react";
import { User } from "../types";
import { Terminal, LogOut, Shield, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "./ui/sheet";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return (
      name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "U"
    );
  };

  return (
    <header className="h-14 border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-all">
      {/* Left: Brand & Engine Status */}
      <div className="flex items-center gap-4 sm:gap-6">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-zinc-100 font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none"
        >
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Terminal size={14} className="stroke-[2.5]" />
          </div>
          <span className="tracking-tight font-bold text-sm text-zinc-100 flex items-center gap-1">
            Judge<span className="text-emerald-400">Core</span>
          </span>
        </button>

        {/* Engine Status Pulse Badge (Responsive: hidden on xs, visible on sm+) */}
        <div className="hidden xs:flex items-center gap-2 bg-zinc-900/60 border border-white/[0.06] rounded-full px-2.5 py-1 text-[11px] text-zinc-400 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
            Status: Online
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateHome}
            className="text-xs text-zinc-300 hover:text-white"
          >
            Problems
          </Button>
        </nav>
      </div>

      {/* Right: Auth Profile / Sign In + Mobile Hamburger */}
      <div className="flex items-center gap-2 sm:gap-3">
        {user ? (
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="flex items-center gap-2 bg-zinc-900 border border-white/[0.08] rounded-full pl-1.5 pr-3 py-1 text-xs text-zinc-200">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold flex items-center justify-center border border-emerald-500/30">
                {getInitials(user.name)}
              </div>
              <span className="font-medium text-[12px] truncate max-w-[120px]">
                {user.name}
              </span>
              {user.role === "ADMIN" && (
                <Badge variant="easy" className="text-[9px] px-1 py-0 uppercase">
                  <Shield size={9} />
                  Admin
                </Badge>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="h-8 w-8 text-zinc-400 hover:text-rose-400"
              title="Sign Out"
            >
              <LogOut size={15} />
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAuth}
            className="hidden sm:inline-flex text-xs"
          >
            Sign In
          </Button>
        )}

        {/* Mobile Hamburger Sheet */}
        <div className="sm:hidden flex items-center gap-1">
          {user && (
            <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold flex items-center justify-center border border-emerald-500/30">
              {getInitials(user.name)}
            </div>
          )}

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                <Menu size={18} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-zinc-950 border-white/[0.08] flex flex-col justify-between">
              <div className="space-y-6 pt-4">
                <SheetHeader>
                  <SheetTitle className="text-left text-zinc-100 flex items-center gap-2">
                    <Terminal size={16} className="text-emerald-400" />
                    JudgeCore
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Mobile navigation options and session details
                  </SheetDescription>
                </SheetHeader>

                {/* Status Indicator in Mobile Menu */}
                <div className="flex items-center gap-2 bg-zinc-900 border border-white/[0.06] rounded-lg p-2.5 text-xs text-zinc-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                    Docker Sandbox: Online
                  </span>
                </div>

                {/* Navigation Links */}
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-xs text-zinc-200"
                    onClick={() => {
                      onNavigateHome();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Problems
                  </Button>
                </div>
              </div>

              {/* Mobile Profile / Auth Footer */}
              <div className="border-t border-white/[0.08] pt-4 pb-2 space-y-3">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-300">
                      <span className="font-medium">{user.name}</span>
                      {user.role === "ADMIN" && (
                        <Badge variant="easy" className="text-[9px]">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full justify-center text-xs"
                      onClick={() => {
                        onLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut size={13} className="mr-1.5" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={() => {
                      onOpenAuth();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
