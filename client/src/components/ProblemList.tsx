import React, { useState, useEffect } from "react";
import { Problem, Difficulty } from "../types";
import { api } from "../api";
import { Search, Code2, Clock, Cpu, ArrowRight } from "lucide-react";

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
      setProblems(data);
    } catch (err: any) {
      setError(err.message || "Failed to load problems");
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = problems.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case "EASY":
        return (
          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full text-xs">
            Easy
          </span>
        );
      case "MEDIUM":
        return (
          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold px-2.5 py-0.5 rounded-full text-xs">
            Medium
          </span>
        );
      case "HARD":
        return (
          <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold px-2.5 py-0.5 rounded-full text-xs">
            Hard
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Title & Banner */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Practice Problems</h1>
        <p className="text-sm text-slate-400">
          Solve real-time algorithm challenges evaluated inside isolated, sandboxed Docker containers.
        </p>
      </div>

      {/* Controls: Search & Difficulty Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search problem title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 self-stretch sm:self-auto">
          {["ALL", "EASY", "MEDIUM", "HARD"].map((diff) => (
            <button
              key={diff}
              onClick={() => setFilterDifficulty(diff)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterDifficulty === diff
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Problem Explorer Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6 font-semibold">Title</th>
                <th className="py-3.5 px-6 font-semibold">Difficulty</th>
                <th className="py-3.5 px-6 font-semibold">Resource Limits</th>
                <th className="py-3.5 px-6 font-semibold">Submissions</th>
                <th className="py-3.5 px-6 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
                    <p>Loading problems...</p>
                  </td>
                </tr>
              ) : filteredProblems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No problems found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredProblems.map((problem) => (
                  <tr
                    key={problem.id}
                    onClick={() => onSelectProblem(problem.slug)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-6 font-medium text-white group-hover:text-emerald-400 transition-colors">
                      <div className="flex items-center gap-2">
                        <Code2 size={16} className="text-slate-500 group-hover:text-emerald-400" />
                        <span>{problem.title}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">{getDifficultyBadge(problem.difficulty)}</td>
                    <td className="py-4 px-6 text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-slate-500" />
                          {problem.timeLimit}ms
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu size={13} className="text-slate-500" />
                          {problem.memoryLimit}MB
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400">
                      {problem._count?.submissions || 0} attempts
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProblem(problem.slug);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 group-hover:bg-emerald-600 font-medium text-xs text-slate-300 group-hover:text-white px-3 py-1.5 transition-colors"
                      >
                        Solve
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

