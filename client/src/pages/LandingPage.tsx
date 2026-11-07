import React from "react";
import { useNavigate } from "react-router-dom";
import { User } from "../types";
import { Shield, Cpu, Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingPageProps {
  user: User | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleStartCoding = () => {
    if (user) {
      navigate("/problems");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#0a0a0c] text-[#ededef] selection:bg-emerald-500/20 selection:text-emerald-300 flex flex-col justify-between items-center px-4 sm:px-8 lg:px-12 py-8 sm:py-12 relative overflow-x-hidden overflow-y-auto">
      {/* -----------------------------------------------------------------
          Ambient Glow Backdrops
      ----------------------------------------------------------------- */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-emerald-500/[0.07] blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[280px] bg-indigo-500/[0.05] blur-[140px] rounded-full pointer-events-none -z-10" />

      {/* -----------------------------------------------------------------
          Centered Hero & Feature Grid (Completely bare, zero top navigation)
      ----------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl my-auto py-8 sm:py-12 text-center">
        {/* Subtle Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-zinc-900/60 text-zinc-400 text-xs font-mono mb-4 sm:mb-6 animate-in fade-in duration-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>v2.0 Isolated Execution Architecture</span>
        </div>

        {/* Massive Hero Headline */}
        <h1 className="text-7xl md:text-9xl font-extrabold tracking-tighter bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent leading-[0.92] text-center mb-4 select-none">
          Verdict Engine
        </h1>

        {/* Muted Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-xl text-center leading-relaxed font-normal mb-8 sm:mb-10">
          High-performance algorithmic evaluation powered by isolated containerization.
        </p>

        {/* Call to Action Button Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-10 sm:mb-14">
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartCoding}
            className="w-full sm:w-auto h-11 px-8 text-xs sm:text-sm font-semibold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 group gap-2"
          >
            <span>{user ? "Go to Problems" : "Start Coding"}</span>
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-1"
            />
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/problems")}
            className="w-full sm:w-auto h-11 px-6 text-xs sm:text-sm border-white/[0.08] hover:bg-white/[0.04] text-zinc-300"
          >
            <span>Browse Directory</span>
          </Button>
        </div>

        {/* ---------------------------------------------------------------
            3-Column Bento Box Technical Feature Grid
        --------------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full text-left">
          {/* Feature 1: Zero-Network Sandboxing */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-white/[0.12] hover:bg-white/[0.03] transition-all shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
              <Shield size={18} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-100 mb-2 tracking-tight">
              Zero-Network Sandboxing
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Secure, non-root C++ execution within isolated Docker micro-sandboxes
              with strictly dropped Linux capabilities, disabled network interfaces,
              and memory cgroups.
            </p>
          </div>

          {/* Feature 2: Asynchronous Queueing */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-white/[0.12] hover:bg-white/[0.03] transition-all shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-105 transition-transform">
              <Cpu size={18} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-100 mb-2 tracking-tight">
              Asynchronous Queueing
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              High-throughput BullMQ worker architecture backed by Redis to decouple
              submission ingestion from compute clusters with sub-second polling.
            </p>
          </div>

          {/* Feature 3: Precision Metrics */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-white/[0.12] hover:bg-white/[0.03] transition-all shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform">
              <Activity size={18} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-100 mb-2 tracking-tight">
              Precision Metrics
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Accurate CPU runtime, memory limits, and strict GCC compilation
              diagnostics with automated watchdog timers for deterministic verdicts.
            </p>
          </div>
        </div>
      </main>

      {/* -----------------------------------------------------------------
          Bottom Minimalist Footer
      ----------------------------------------------------------------- */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-600 font-mono pt-3 pb-1 border-t border-white/[0.04]">
        <span>Verdict Engine • Production Sandboxing Infrastructure</span>
        <span>Docker Cgroups • Redis BullMQ • GCC 17</span>
      </footer>
    </div>
  );
};

export default LandingPage;
