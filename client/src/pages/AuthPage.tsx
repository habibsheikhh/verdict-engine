import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { User } from "../types";
import { Terminal, Lock, Mail, User as UserIcon, AlertCircle, ArrowLeft } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthPageProps {
  onSuccess: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { user } = await api.login(email, password);
        onSuccess(user);
        navigate("/problems");
      } else {
        const { user } = await api.register(email, password, name || "Coder");
        onSuccess(user);
        navigate("/problems");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLogin(true);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#ededef] flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>

        <Link
          to="/"
          className="flex items-center gap-2 text-zinc-100 font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <div className="h-6 w-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Terminal size={12} className="stroke-[2.5]" />
          </div>
          <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent font-extrabold tracking-tighter text-xs">
            Verdict Engine
          </span>
        </Link>
      </header>

      {/* Centered Auth Card Container */}
      <main className="w-full flex items-center justify-center py-8">
        <Card className="w-full max-w-sm sm:max-w-md shadow-2xl bg-zinc-950/80 border-white/[0.08] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-200">
          <CardHeader className="space-y-1.5 text-center sm:text-left">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              {isLogin
                ? "Sign in to evaluate solutions against zero-network sandboxes."
                : "Register to solve algorithmic challenges and track metrics."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <UserIcon
                      className="absolute left-3 top-2.5 text-zinc-500 pointer-events-none"
                      size={14}
                    />
                    <Input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alan Turing"
                      className="pl-9"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-2.5 text-zinc-500 pointer-events-none"
                    size={14}
                  />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@example.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-2.5 text-zinc-500 pointer-events-none"
                    size={14}
                  />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full text-xs font-semibold h-9 mt-2"
              >
                {loading
                  ? "Authenticating..."
                  : isLogin
                  ? "Sign In"
                  : "Create Account"}
              </Button>
            </form>

            {/* Toggle State */}
            <div className="pt-2 text-center text-xs text-zinc-400">
              <span>{isLogin ? "Don't have an account? " : "Already registered? "}</span>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="text-emerald-400 hover:underline font-semibold transition-colors"
              >
                {isLogin ? "Register now" : "Sign in"}
              </button>
            </div>
          </CardContent>

          {/* Quick Demo Credentials Footer */}
          <CardFooter className="flex flex-col gap-2 border-t border-white/[0.06] pt-4">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider self-center">
              1-Click Demo Evaluation
            </span>
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemoCredentials("user@oj.com", "user123")}
                className="flex-1 text-[11px] h-7 border-white/[0.08]"
              >
                Demo User
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemoCredentials("admin@oj.com", "admin123")}
                className="flex-1 text-[11px] h-7 border-white/[0.08]"
              >
                Demo Admin
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-2 text-[11px] text-zinc-600 font-mono">
        Secured with TLS • Isolated Sandbox Pipeline
      </footer>
    </div>
  );
};

export default AuthPage;

