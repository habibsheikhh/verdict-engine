import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Problem, Submission, User, Verdict } from "../types";
import { api } from "../api";
import {
  Clock,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  History,
  FileText,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

interface ProblemDetailProps {
  slug: string;
  user: User | null;
  onOpenAuth: () => void;
  onBack: () => void;
}

export const ProblemDetail: React.FC<ProblemDetailProps> = ({
  slug,
  user,
  onOpenAuth,
  onBack,
}) => {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Left Pane Tabs
  const [leftTab, setLeftTab] = useState<"description" | "submissions">("description");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Monaco Code Editor
  const [code, setCode] = useState<string>("");

  // Submission State & Polling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [bottomTab, setBottomTab] = useState<"testcase" | "verdict">("testcase");
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    fetchProblemDetails();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [slug]);

  const fetchProblemDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { problem: data } = await api.getProblemBySlug(slug);
      setProblem(data);
      setCode(data.templateCode || "// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}");
      if (user) {
        fetchSubmissions(data.id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load problem details");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (problemId: string) => {
    setLoadingSubmissions(true);
    try {
      const data = await api.getSubmissions(problemId);
      setSubmissions(data);
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!problem) return;

    setIsSubmitting(true);
    setBottomTab("verdict");
    setActiveSubmission({
      id: "pending",
      userId: user.id,
      problemId: problem.id,
      language: "cpp",
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });

    try {
      const newSub = await api.createSubmission(problem.id, code, "cpp");
      setActiveSubmission(newSub);

      // Start Polling
      if (pollingRef.current) clearInterval(pollingRef.current);

      pollingRef.current = window.setInterval(async () => {
        try {
          const polled = await api.getSubmissionById(newSub.id);
          setActiveSubmission(polled);

          // Terminal verdict reached
          if (polled.status !== "PENDING" && polled.status !== "PROCESSING") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsSubmitting(false);
            fetchSubmissions(problem.id); // Refresh history
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsSubmitting(false);
        }
      }, 750);
    } catch (err: any) {
      setIsSubmitting(false);
      setActiveSubmission((prev) =>
        prev ? { ...prev, status: "INTERNAL_ERROR", errorMessage: err.message } : null
      );
    }
  };

  const handleResetCode = () => {
    if (problem && window.confirm("Reset code back to the default template?")) {
      setCode(problem.templateCode);
    }
  };

  const getVerdictBadge = (verdict: Verdict) => {
    switch (verdict) {
      case "ACCEPTED":
        return (
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <CheckCircle2 size={16} />
            Accepted
          </span>
        );
      case "WRONG_ANSWER":
        return (
          <span className="flex items-center gap-1.5 text-rose-400 font-bold">
            <XCircle size={16} />
            Wrong Answer
          </span>
        );
      case "TIME_LIMIT_EXCEEDED":
        return (
          <span className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Clock size={16} />
            Time Limit Exceeded
          </span>
        );
      case "MEMORY_LIMIT_EXCEEDED":
        return (
          <span className="flex items-center gap-1.5 text-purple-400 font-bold">
            <Cpu size={16} />
            Memory Limit Exceeded
          </span>
        );
      case "COMPILATION_ERROR":
        return (
          <span className="flex items-center gap-1.5 text-orange-400 font-bold">
            <AlertTriangle size={16} />
            Compilation Error
          </span>
        );
      case "RUNTIME_ERROR":
        return (
          <span className="flex items-center gap-1.5 text-red-400 font-bold">
            <ShieldAlert size={16} />
            Runtime Error
          </span>
        );
      case "PROCESSING":
        return (
          <span className="flex items-center gap-1.5 text-blue-400 font-bold animate-pulse">
            <div className="h-3 w-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
            Running in Docker...
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="flex items-center gap-1.5 text-slate-400 font-bold animate-pulse">
            <div className="h-3 w-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div>
            Queued in Redis...
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mb-3"></div>
          <p className="text-sm text-slate-400">Loading problem environment...</p>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-red-400 mb-4">
          {error || "Problem not found"}
        </div>
        <button
          onClick={onBack}
          className="rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-2 transition-colors"
        >
          Return to Problems
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-950">
      {/* -------------------------------------------------------------
          LEFT PANE: Description & Past Submissions
      ------------------------------------------------------------- */}
      <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/40">
        {/* Left Tabs Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 h-11 bg-slate-900/80">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLeftTab("description")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                leftTab === "description"
                  ? "bg-slate-800 text-emerald-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText size={14} />
              Description
            </button>
            <button
              onClick={() => {
                setLeftTab("submissions");
                if (problem) fetchSubmissions(problem.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                leftTab === "submissions"
                  ? "bg-slate-800 text-emerald-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <History size={14} />
              Submissions
            </button>
          </div>

          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← Back to List
          </button>
        </div>

        {/* Left Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {leftTab === "description" ? (
            <>
              {/* Problem Header Info */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      problem.difficulty === "EASY"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : problem.difficulty === "MEDIUM"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {problem.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                    <Clock size={13} className="text-emerald-400" />
                    Time Limit: {problem.timeLimit}ms
                  </span>
                  <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                    <Cpu size={13} className="text-teal-400" />
                    Memory Limit: {problem.memoryLimit}MB
                  </span>
                </div>
              </div>

              {/* Problem Description Statement */}
              <div className="text-sm text-slate-300 leading-relaxed space-y-4 whitespace-pre-line border-t border-slate-800/80 pt-4">
                {problem.description}
              </div>

              {/* Sample Test Cases (Public Only) */}
              {problem.testCases && problem.testCases.length > 0 && (
                <div className="border-t border-slate-800/80 pt-4 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Sample Test Cases
                  </h3>
                  {problem.testCases.map((tc, idx) => (
                    <div
                      key={tc.id || idx}
                      className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3"
                    >
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                        Example {idx + 1}
                      </span>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 mb-1">
                          Input:
                        </div>
                        <pre className="bg-slate-950 rounded-lg p-2.5 text-xs text-slate-200 font-mono overflow-x-auto border border-slate-800">
                          {tc.input}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 mb-1">
                          Expected Output:
                        </div>
                        <pre className="bg-slate-950 rounded-lg p-2.5 text-xs text-slate-200 font-mono overflow-x-auto border border-slate-800">
                          {tc.expectedOutput}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Submissions History Tab */
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Submission Audit Log
              </h3>
              {loadingSubmissions ? (
                <p className="text-xs text-slate-500">Loading history...</p>
              ) : submissions.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-xs text-slate-400">
                  No submissions yet. Write your code and click Submit!
                </div>
              ) : (
                <div className="space-y-2">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="text-xs">{getVerdictBadge(sub.status)}</div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {new Date(sub.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        {sub.executionTime != null && (
                          <div className="font-mono">{sub.executionTime}ms</div>
                        )}
                        {sub.failedTestCase != null && (
                          <div className="text-rose-400 text-[10px]">
                            Failed testcase #{sub.failedTestCase}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          RIGHT PANE: Monaco Code Editor + Evaluation Panel
      ------------------------------------------------------------- */}
      <div className="w-full lg:w-1/2 flex flex-col bg-slate-950">
        {/* Editor Controls Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 h-11 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded">
              C++ 17 (GCC)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCode}
              title="Reset to template starter code"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div className="flex-1 relative min-h-[300px]">
          <Editor
            height="100%"
            defaultLanguage="cpp"
            language="cpp"
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || "")}
            options={{
              fontSize: 13,
              fontFamily: "'Fira Code', Menlo, Monaco, Consolas, monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              wordWrap: "on",
              bracketPairColorization: { enabled: true },
              formatOnPaste: true,
            }}
          />
        </div>

        {/* Bottom Collapsible Panel: Testcase / Verdict */}
        <div className="h-56 border-t border-slate-800 bg-slate-900/90 flex flex-col">
          {/* Panel Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 h-9 bg-slate-900">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBottomTab("testcase")}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                  bottomTab === "testcase"
                    ? "text-emerald-400 bg-slate-800"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sample Input
              </button>
              <button
                onClick={() => setBottomTab("verdict")}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                  bottomTab === "verdict"
                    ? "text-emerald-400 bg-slate-800"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Verdict & Output
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold text-xs text-white px-4 py-1.5 transition-colors shadow-md shadow-emerald-950"
              >
                <Play size={12} className="fill-current" />
                {isSubmitting ? "Evaluating..." : "Submit Code"}
              </button>
            </div>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
            {bottomTab === "testcase" ? (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 block font-sans">
                  Standard Input (stdin passed to container):
                </span>
                <pre className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-slate-300 overflow-x-auto">
                  {problem.testCases?.[0]?.input || "No sample input defined."}
                </pre>
              </div>
            ) : (
              /* Verdict Tab */
              <div>
                {!activeSubmission ? (
                  <p className="text-slate-500 font-sans">
                    Click &quot;Submit Code&quot; to queue and evaluate your solution in an isolated Docker container.
                  </p>
                ) : (
                  <div className="space-y-3 font-sans">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="text-sm">{getVerdictBadge(activeSubmission.status)}</div>
                      {activeSubmission.executionTime != null && (
                        <div className="text-xs text-slate-400 font-mono">
                          Runtime: <span className="text-emerald-400">{activeSubmission.executionTime}ms</span>
                        </div>
                      )}
                    </div>

                    {/* Additional Details by Verdict */}
                    {activeSubmission.status === "ACCEPTED" && (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-300 text-xs">
                        🎉 All test cases passed within CPU and memory resource constraints!
                      </div>
                    )}

                    {activeSubmission.status === "WRONG_ANSWER" && (
                      <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 text-xs">
                        Output mismatch on Test Case #{activeSubmission.failedTestCase || 1}.
                      </div>
                    )}

                    {activeSubmission.status === "TIME_LIMIT_EXCEEDED" && (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-amber-300 text-xs">
                        Execution timed out beyond the {problem.timeLimit}ms limit. Process was safely terminated by the sandbox watchdog.
                      </div>
                    )}

                    {activeSubmission.status === "MEMORY_LIMIT_EXCEEDED" && (
                      <div className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-3 text-purple-300 text-xs">
                        Memory limit exceeded. The process exceeded the {problem.memoryLimit}MB cgroup quota and was terminated by the OOM killer.
                      </div>
                    )}

                    {activeSubmission.status === "COMPILATION_ERROR" && activeSubmission.errorMessage && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-orange-400 block">
                          GCC Compiler Output:
                        </span>
                        <pre className="bg-slate-950 border border-orange-500/30 p-2.5 rounded-lg text-orange-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                          {activeSubmission.errorMessage}
                        </pre>
                      </div>
                    )}

                    {activeSubmission.status === "RUNTIME_ERROR" && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-red-400 block">
                          Runtime Signal Error:
                        </span>
                        <pre className="bg-slate-950 border border-red-500/30 p-2.5 rounded-lg text-red-300 font-mono text-[11px] overflow-x-auto">
                          {activeSubmission.errorMessage || "Process terminated with a non-zero exit code (SIGSEGV or SIGFPE)."}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

