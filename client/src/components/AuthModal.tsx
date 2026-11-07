import React, { useState } from "react";
import { api } from "../api";
import { User } from "../types";
import { X, Lock, Mail, User as UserIcon, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { user } = await api.login(email, password);
        onSuccess(user);
        onClose();
      } else {
        const { user } = await api.register(email, password, name);
        onSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoUser = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLogin(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-zinc-950 border border-white/[0.08] p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 h-7 w-7 text-zinc-500 hover:text-white"
        >
          <X size={16} />
        </Button>

        <h2 className="text-lg font-bold tracking-tight text-zinc-100 mb-1">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="text-xs text-zinc-400 mb-5">
          {isLogin
            ? "Sign in to evaluate solutions and record submission history."
            : "Register to practice and evaluate algorithms."}
        </p>

        {error && (
          <Alert variant="destructive" className="mb-4 py-2.5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon
                  className="absolute left-3 top-2.5 text-zinc-500"
                  size={14}
                />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Linus Torvalds"
                  className="w-full rounded-lg bg-zinc-900 border border-white/[0.08] py-2 pl-9 pr-3 text-zinc-100 text-xs placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-2.5 text-zinc-500"
                size={14}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full rounded-lg bg-zinc-900 border border-white/[0.08] py-2 pl-9 pr-3 text-zinc-100 text-xs placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-2.5 text-zinc-500"
                size={14}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-zinc-900 border border-white/[0.08] py-2 pl-9 pr-3 text-zinc-100 text-xs placeholder-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full mt-1 text-xs font-semibold"
          >
            {loading ? "Authenticating..." : isLogin ? "Sign In" : "Register"}
          </Button>
        </form>

        <div className="mt-4 pt-3.5 border-t border-white/[0.06] text-xs text-zinc-400 text-center">
          {isLogin ? "Need an account? " : "Already registered? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-emerald-400 hover:underline font-semibold"
          >
            {isLogin ? "Register" : "Sign In"}
          </button>
        </div>

        {/* 1-Click Fast Credentials */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2 text-center">
            One-Click Demo Credentials
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemoUser("user@oj.com", "user123")}
              className="flex-1 text-[11px] h-7"
            >
              Demo User
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemoUser("admin@oj.com", "admin123")}
              className="flex-1 text-[11px] h-7"
            >
              Demo Admin
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
