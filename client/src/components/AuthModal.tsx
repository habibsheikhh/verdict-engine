import React, { useState } from "react";
import { api } from "../api";
import { User } from "../types";
import { X, Lock, Mail, User as UserIcon } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-2">
          {isLogin ? "Welcome Back" : "Create an Account"}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {isLogin
            ? "Sign in to submit solutions and track verdicts."
            : "Register to practice and evaluate algorithms."}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 py-2 pl-9 pr-3 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-500" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coder@example.com"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 py-2 pl-9 pr-3 text-white text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-500" size={16} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 py-2 pl-9 pr-3 text-white text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium py-2.5 text-white text-sm transition-colors shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Register"}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 text-center">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-emerald-400 hover:underline font-semibold"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>

        {/* Demo Fast Logins */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 text-center">
            One-Click Demo Credentials
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fillDemoUser("user@oj.com", "user123")}
              className="flex-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs py-1.5 transition-colors"
            >
              Demo User
            </button>
            <button
              type="button"
              onClick={() => fillDemoUser("admin@oj.com", "admin123")}
              className="flex-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs py-1.5 transition-colors"
            >
              Demo Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

