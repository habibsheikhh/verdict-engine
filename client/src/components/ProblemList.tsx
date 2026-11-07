import React, { useState, useEffect } from "react";
import { Problem, Difficulty } from "../types";
import { api } from "../api";
import { Search, Code2, Clock, Cpu, ArrowRight } from "lucide-react";
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
      {/* Streamlined Hero Section */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 mb-1.5">
          Problem Explorer
        </h1>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
          Algorithmic problems evaluated against hidden test suites inside isolated,
          zero-network Docker sandboxes.
        </p>
      </div>

      {/* Filter Bar: Search + Difficulty Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-3 top-2.5 text-zinc-500 pointer-events-none"
            size={14}
          />
          <input
            type="text"
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
          />
        </div>

        {/* Difficulty Filter Pills */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-white/[0.08] rounded-lg p-1 self-start sm:self-auto overflow-x-auto max-w-full">
          {["ALL", "EASY", "MEDIUM", "HARD"].map((diff) => (
            <button
              key={diff}
              onClick={() => setFilterDifficulty(diff)}
              className={`px-3 py-1 text-[11px] font-semibold tracking-wider rounded-md transition-all whitespace-nowrap ${
                filterDifficulty === diff
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400 mb-6">
          {error}
        </div>
      )}

      {/* Responsive shadcn Table with horizontal scroll on mobile */}
      <div className="rounded-xl border border-white/[0.08] bg-zinc-950 overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/60 border-b border-white/[0.06]">
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
                  className="cursor-pointer group hover:bg-white/[0.02] border-white/[0.04]"
                >
                  {/* Problem Title */}
                  <TableCell className="py-3.5 px-4 sm:px-6 font-medium text-zinc-100 group-hover:text-emerald-400 transition-colors">
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

                  {/* Solve CTA */}
                  <TableCell className="py-3.5 px-4 sm:px-6 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProblem(problem.slug);
                      }}
                      className="group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500/50 text-xs gap-1.5 h-7 px-2.5 font-medium"
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
