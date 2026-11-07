import React, { useState, useEffect } from "react";
import { Problem, Difficulty } from "../types";
import { api } from "../api";
import {
  Search,
  Code2,
  Clock,
  Cpu,
  ArrowRight,
  Terminal,
  Zap,
  Layers,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface ProblemListProps {
  onSelectProblem: (slug: string) => void;
}

export const ProblemList: React.FC<ProblemListProps> = ({ onSelectProblem }) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProblems();
  }, [filterDifficulty]);

  const fetchProblems = async () => {
    setLoading(true);
    setError(null);
    try {
      const diff = filterDifficulty === "ALL" ? undefined : filterDifficulty;
      const data = await api.getProblems(diff);
      setProblems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load problems");
    } finally {
      setLoading(false);
    }
  };

  const safeProblems = Array.isArray(problems) ? problems : [];
  const filteredProblems = safeProblems.filter((p) =>
    (p.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case "EASY":
        return <Badge variant="easy">Easy</Badge>;
      case "MEDIUM":
        return <Badge variant="medium">Medium</Badge>;
      case "HARD":
        return <Badge variant="hard">Hard</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* -----------------------------------------------------------------
          1. Streamlined Dashboard Hero
      ----------------------------------------------------------------- */}
      <div className="mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-white/[0.08] bg-zinc-900/60 text-zinc-400 text-[10px] font-mono uppercase tracking-wider mb-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Core Evaluation Library</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent mb-1.5">
          Problem Explorer
        </h1>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
          Algorithmic problems evaluated against hidden test suites inside isolated,
          zero-network Docker sandboxes with strict CPU and memory cgroups.
        </p>
      </div>

      {/* -----------------------------------------------------------------
          2. 3-Column Bento Box Stats Row
      ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8">
        {/* Stat Card 1: Execution Engine */}
        <div className="bg-zinc-950/50 backdrop-blur-md border border-white/[0.05] rounded-xl p-4 flex flex-col justify-between hover:border-white/[0.10] transition-all shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide text-zinc-400">
              Execution Engine
            </span>
            <Terminal size={14} className="text-zinc-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-bold tracking-tight text-zinc-100">
                Docker Sandbox Online
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">
              Strict memory/CPU cgroups
            </p>
          </div>
        </div>

        {/* Stat Card 2: Algorithm Library */}
        <div className="bg-zinc-950/50 backdrop-blur-md border border-white/[0.05] rounded-xl p-4 flex flex-col justify-between hover:border-white/[0.10] transition-all shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide text-zinc-400">
              Algorithm Library
            </span>
            <Layers size={14} className="text-zinc-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold tracking-tight text-zinc-100 font-mono">
                {loading ? "..." : safeProblems.length}
              </span>
              <span className="text-xs text-zinc-400 font-medium">Challenges Available</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">
              Easy, Medium &amp; Hard suites
            </p>
          </div>
        </div>

        {/* Stat Card 3: Global Latency */}
        <div className="bg-zinc-950/50 backdrop-blur-md border border-white/[0.05] rounded-xl p-4 flex flex-col justify-between hover:border-white/[0.10] transition-all shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide text-zinc-400">
              Global Latency
            </span>
            <Zap size={14} className="text-zinc-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold tracking-tight text-emerald-400 font-mono">
                38ms
              </span>
              <span className="text-xs text-zinc-400 font-medium">p99 startup</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">
              Sub-second Redis queue dispatch
            </p>
          </div>
        </div>
      </div>

      {/* -----------------------------------------------------------------
          3. Filter Bar: Search + Semantic Difficulty Pills
      ----------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Search Input with deeper background and focus ring */}
        <div className="relative w-full sm:w-80 group">
          <Search
            className="absolute left-3.5 top-3 text-zinc-500 pointer-events-none transition-colors group-focus-within:text-zinc-300"
            size={14}
          />
          <input
            type="text"
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-zinc-700 transition-all shadow-inner"
          />
        </div>

        {/* Difficulty Filter Pills with semantic colors on active state */}
        <div className="flex items-center gap-1.5 bg-zinc-950/80 border border-white/[0.08] rounded-xl p-1 self-start sm:self-auto overflow-x-auto max-w-full backdrop-blur-md">
          {[
            { key: "ALL", label: "All" },
            { key: "EASY", label: "Easy" },
            { key: "MEDIUM", label: "Medium" },
            { key: "HARD", label: "Hard" },
          ].map(({ key, label }) => {
            const isActive = filterDifficulty === key;

            let activeStyles =
              "bg-white/[0.10] text-zinc-100 shadow-sm border border-white/[0.12]";
            if (key === "EASY") {
              activeStyles =
                "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10";
            } else if (key === "MEDIUM") {
              activeStyles =
                "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10";
            } else if (key === "HARD") {
              activeStyles =
                "bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10";
            }

            return (
              <button
                key={key}
                onClick={() => setFilterDifficulty(key)}
                className={`px-3 py-1.5 text-[11px] font-semibold tracking-wide rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? activeStyles
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400 mb-6">
          {error}
        </div>
      )}

      {/* -----------------------------------------------------------------
          4. Frosted Glass Table Container with High-End Row Hover
      ----------------------------------------------------------------- */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/40 border-b border-white/[0.06]">
            <TableRow className="hover:bg-transparent border-white/[0.06]">
              <TableHead className="py-3 px-4 sm:px-6 w-[40%] min-w-[200px]">
                Title
              </TableHead>
              <TableHead className="py-3 px-4 sm:px-6 min-w-[100px]">
                Difficulty
              </TableHead>
              <TableHead className="py-3 px-4 sm:px-6 min-w-[160px]">
                Specifications
              </TableHead>
              <TableHead className="py-3 px-4 sm:px-6 min-w-[110px]">
                Submissions
              </TableHead>
              <TableHead className="py-3 px-4 sm:px-6 text-right min-w-[90px]">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-16 text-center text-zinc-500"
                >
                  <div className="inline-block animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
                  <p className="text-xs">Loading problem directory...</p>
                </TableCell>
              </TableRow>
            ) : filteredProblems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-16 text-center text-zinc-500 text-xs"
                >
                  No algorithmic challenges match your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredProblems.map((problem) => (
                <TableRow
                  key={problem.id}
                  onClick={() => onSelectProblem(problem.slug)}
                  className="cursor-pointer group border-white/[0.04] hover:bg-white/[0.03] hover:scale-[1.01] transition-transform duration-150 ease-out origin-left"
                >
                  {/* Problem Title + Inset 2.5px Left Emerald Glow Strip */}
                  <TableCell className="py-3.5 px-4 sm:px-6 font-medium text-zinc-100 group-hover:text-emerald-400 transition-colors relative">
                    {/* High-end Glowing Inset Left Strip on Hover */}
                    <span className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_rgba(52,211,153,0.6)]" />

                    <div className="flex items-center gap-2.5">
                      <Code2
                        size={15}
                        className="text-zinc-500 group-hover:text-emerald-400 transition-colors flex-shrink-0"
                      />
                      <span className="font-medium text-xs sm:text-sm truncate">
                        {problem.title}
                      </span>
                    </div>
                  </TableCell>

                  {/* Difficulty Badge */}
                  <TableCell className="py-3.5 px-4 sm:px-6">
                    {renderDifficultyBadge(problem.difficulty)}
                  </TableCell>

                  {/* Hardware & Sandbox Limits */}
                  <TableCell className="py-3.5 px-4 sm:px-6 font-mono text-[11px] text-zinc-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-zinc-500" />
                        {problem.timeLimit}ms
                      </span>
                      <span className="flex items-center gap-1">
                        <Cpu size={11} className="text-zinc-500" />
                        {problem.memoryLimit}MB
                      </span>
                    </div>
                  </TableCell>

                  {/* Submission Statistics */}
                  <TableCell className="py-3.5 px-4 sm:px-6 font-mono text-[11px] text-zinc-500">
                    {problem._count?.submissions || 0} attempts
                  </TableCell>

                  {/* Tactile Solve CTA Button with subtle hover glow */}
                  <TableCell className="py-3.5 px-4 sm:px-6 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProblem(problem.slug);
                      }}
                      className="group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.25)] active:scale-95 text-xs gap-1.5 h-7 px-3 font-medium transition-all"
                    >
                      <span>Solve</span>
                      <ArrowRight
                        size={11}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProblemList;
