import React, { useState, useEffect, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Problem, Submission, User, Verdict } from "../types";
import { api } from "../api";
import {
  Clock,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldAlert,
  Copy,
  Check,
  ArrowLeft,
  FileText,
  History,
} from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";

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
  // Strip any leading slashes or hashes from slug
  const normalizedSlug = (slug || "").replace(/^[#/]+/, "");

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Left Pane Active Tab
  const [leftTab, setLeftTab] = useState<string>("description");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Copy feedback state for sample test cases
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Monaco Code Editor state
  const [code, setCode] = useState<string>("");

  // Submission & Polling State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [bottomTab, setBottomTab] = useState<string>("testcase");
  const pollingRef = useRef<number | null>(null);

  // Screen width detection for responsive Resizable split-pane
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchProblemDetails();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [normalizedSlug]);

  const fetchProblemDetails = async () => {
    if (!normalizedSlug) {
      setError("Problem identifier is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.getProblemBySlug(normalizedSlug);
      const data = res?.problem;

      if (!data) {
        throw new Error(`Problem "${normalizedSlug}" not found`);
      }

      setProblem(data);
      setCode(
        data.templateCode ||
          "// Write your C++ solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}"
      );

      if (user && data.id) {
        fetchSubmissions(data.id);
      }
    } catch (err: any) {
      console.error("Failed to load problem details:", err);
      setError(err.message || "Failed to load problem details");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (problemId: string) => {
    if (!problemId) return;
    setLoadingSubmissions(true);
    try {
      const data = await api.getSubmissions(problemId);
      setSubmissions(Array.isArray(data) ? data : []);
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
    if (!problem?.id) return;

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

      if (pollingRef.current) clearInterval(pollingRef.current);

      pollingRef.current = window.setInterval(async () => {
        try {
          const polled = await api.getSubmissionById(newSub.id);
          setActiveSubmission(polled);

          // Terminal verdict reached
          if (polled.status !== "PENDING" && polled.status !== "PROCESSING") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsSubmitting(false);
            if (problem?.id) fetchSubmissions(problem.id);
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsSubmitting(false);
        }
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      setActiveSubmission((prev) =>
        prev
          ? { ...prev, status: "INTERNAL_ERROR", errorMessage: err.message }
          : null
      );
    }
  };

  const handleResetCode = () => {
    if (problem && window.confirm("Reset code back to starter boilerplate?")) {
      setCode(problem.templateCode || "");
    }
  };

  const handleCopyInput = (input: string, index: number) => {
    if (!input) return;
    navigator.clipboard.writeText(input);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleEditorMount: OnMount = (_, monaco) => {
    monaco.editor.defineTheme("judge-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#09090b",
        "editor.lineHighlightBackground": "#141417",
        "editorLineNumber.foreground": "#52525b",
        "editorLineNumber.activeForeground": "#ededef",
        "editorGutter.background": "#09090b",
        "editorCursor.foreground": "#10b981",
        "editor.selectionBackground": "#27273a",
      },
    });
    monaco.editor.setTheme("judge-dark");
  };

  const getVerdictBadge = (verdict: Verdict) => {
    switch (verdict) {
      case "ACCEPTED":
        return (
          <Badge variant="success" className="text-xs">
            <CheckCircle2 size={13} className="mr-1" />
            Accepted
          </Badge>
        );
      case "WRONG_ANSWER":
        return (
          <Badge variant="error" className="text-xs">
            <XCircle size={13} className="mr-1" />
            Wrong Answer
          </Badge>
        );
      case "TIME_LIMIT_EXCEEDED":
        return (
          <Badge variant="warning" className="text-xs">
            <Clock size={13} className="mr-1" />
            Time Limit Exceeded
          </Badge>
        );
      case "MEMORY_LIMIT_EXCEEDED":
        return (
          <Badge
            variant="info"
            className="text-xs text-purple-400 border-purple-500/20 bg-purple-500/10"
          >
            <Cpu size={13} className="mr-1" />
            Memory Limit Exceeded
          </Badge>
        );
      case "COMPILATION_ERROR":
        return (
          <Badge
            variant="warning"
            className="text-xs text-orange-400 border-orange-500/20 bg-orange-500/10"
          >
            <AlertTriangle size={13} className="mr-1" />
            Compilation Error
          </Badge>
        );
      case "RUNTIME_ERROR":
        return (
          <Badge variant="error" className="text-xs">
            <ShieldAlert size={13} className="mr-1" />
            Runtime Error
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="info" className="text-xs animate-pulse">
            <div className="h-2.5 w-2.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mr-1.5" />
            Running in Docker...
          </Badge>
        );
      case "PENDING":
      default:
        return (
          <Badge variant="muted" className="text-xs animate-pulse">
            <div className="h-2.5 w-2.5 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin mr-1.5" />
            Queued in Redis...
          </Badge>
        );
    }
  };

  // 1. Loading State (Prevents reading properties of null/undefined)
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] w-full items-center justify-center bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin h-7 w-7 border-2 border-emerald-500 border-t-transparent rounded-full" />
          <p className="text-xs text-zinc-400 font-mono">
            Booting isolated execution sandbox...
          </p>
        </div>
      </div>
    );
  }

  // 2. Error / Missing Problem State
  if (error || !problem) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] w-full items-center justify-center bg-zinc-950 p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <Alert variant="destructive" className="text-left">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Problem Unavailable</AlertTitle>
            <AlertDescription className="mt-1">
              {error || `Unable to load problem "${normalizedSlug}". Please return to the explorer.`}
            </AlertDescription>
          </Alert>
          <Button variant="default" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft size={13} />
            <span>Return to Problem List</span>
          </Button>
        </div>
      </div>
    );
  }

  // Safe fallback values
  const title = problem.title || "Untitled Problem";
  const difficulty = problem.difficulty || "EASY";
  const timeLimit = problem.timeLimit ?? 2000;
  const memoryLimit = problem.memoryLimit ?? 256;
  const description = problem.description || "*No description provided for this challenge.*";
  const testCases = Array.isArray(problem.testCases) ? problem.testCases : [];

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-zinc-950 flex flex-col">
      {/* Resizable Split-Pane (Horizontal on Desktop, Vertical Stack on Mobile) */}
      <ResizablePanelGroup
        key={isDesktop ? "desktop-layout" : "mobile-layout"}
        direction={isDesktop ? "horizontal" : "vertical"}
        className="h-full w-full"
      >
        {/* -----------------------------------------------------------------
            LEFT PANE: Problem Description & Past Submissions Tabs
        ----------------------------------------------------------------- */}
        <ResizablePanel
          id="problem-description-panel"
          defaultSize={isDesktop ? 50 : 45}
          minSize={isDesktop ? 25 : 20}
          className="flex flex-col bg-zinc-950 overflow-hidden"
        >
          <Tabs
            value={leftTab}
            onValueChange={(val) => {
              setLeftTab(val);
              if (val === "submissions" && problem.id) {
                fetchSubmissions(problem.id);
              }
            }}
            className="flex flex-col h-full overflow-hidden"
          >
            {/* Left Header Navigation Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 h-10 bg-zinc-900/60 flex-shrink-0">
              <TabsList className="bg-transparent p-0">
                <TabsTrigger value="description">
                  <FileText size={13} />
                  <span>Description</span>
                </TabsTrigger>
                <TabsTrigger value="submissions">
                  <History size={13} />
                  <span>Submissions</span>
                </TabsTrigger>
              </TabsList>

              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="h-7 text-[11px] text-zinc-400 hover:text-white px-2 gap-1"
              >
                <ArrowLeft size={11} />
                <span className="hidden sm:inline">Problem List</span>
              </Button>
            </div>

            {/* Tab Content: Problem Description */}
            <TabsContent
              value="description"
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 m-0"
            >
              {/* Problem Title & Technical Limits */}
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">
                    {title}
                  </h1>
                  <Badge
                    variant={
                      difficulty === "EASY"
                        ? "easy"
                        : difficulty === "MEDIUM"
                        ? "medium"
                        : "hard"
                    }
                  >
                    {difficulty}
                  </Badge>
                </div>

                <div className="flex items-center gap-2.5 text-[11px] font-mono text-zinc-400 mt-2">
                  <span className="inline-flex items-center gap-1 bg-zinc-900 border border-white/[0.06] px-2 py-0.5 rounded">
                    <Clock size={11} className="text-zinc-500" />
                    {timeLimit}ms
                  </span>
                  <span className="inline-flex items-center gap-1 bg-zinc-900 border border-white/[0.06] px-2 py-0.5 rounded">
                    <Cpu size={11} className="text-zinc-500" />
                    {memoryLimit}MB
                  </span>
                </div>
              </div>

              {/* Styled Semantic Markdown Description */}
              <div className="border-t border-white/[0.06] pt-4 text-xs text-zinc-300 leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h2 className="text-sm font-bold text-zinc-100 mt-4 mb-2 tracking-tight">
                        {children}
                      </h2>
                    ),
                    h2: ({ children }) => (
                      <h3 className="text-xs font-bold text-zinc-200 mt-3.5 mb-1.5 uppercase tracking-wider">
                        {children}
                      </h3>
                    ),
                    h3: ({ children }) => (
                      <h4 className="text-xs font-semibold text-zinc-200 mt-3 mb-1">
                        {children}
                      </h4>
                    ),
                    p: ({ children }) => (
                      <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1 mb-3">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-1 mb-3">
                        {children}
                      </ol>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-zinc-200">
                        {children}
                      </strong>
                    ),
                    code: ({ children }) => (
                      <code className="bg-zinc-900 text-zinc-200 px-1.5 py-0.5 rounded font-mono text-[11px] border border-white/[0.06]">
                        {children}
                      </code>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-emerald-500/40 pl-3 italic text-zinc-400 my-2">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {description}
                </ReactMarkdown>
              </div>

              {/* Sample Test Cases (Terminal styled with Copy-to-Clipboard) */}
              {testCases.length > 0 && (
                <div className="border-t border-white/[0.06] pt-4 space-y-3">
                  <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Examples
                  </h3>

                  {testCases.map((tc, idx) => (
                    <div
                      key={tc.id || idx}
                      className="rounded-xl bg-zinc-900/70 border border-white/[0.06] p-3.5 sm:p-4 space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-200 font-mono tracking-wide">
                          Example {idx + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyInput(tc.input, idx)}
                          className="h-6 px-2 text-[10px] text-zinc-400 hover:text-white border border-white/[0.06]"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check size={11} className="text-emerald-400 mr-1" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} className="mr-1" />
                              <span>Copy Input</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
                          Input:
                        </div>
                        <pre className="bg-zinc-950 rounded-lg p-2.5 text-xs text-zinc-200 font-mono overflow-x-auto border border-white/[0.04]">
                          {typeof tc.input === "string" ? tc.input : JSON.stringify(tc.input ?? "")}
                        </pre>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
                          Expected Output:
                        </div>
                        <pre className="bg-zinc-950 rounded-lg p-2.5 text-xs text-zinc-200 font-mono overflow-x-auto border border-white/[0.04]">
                          {typeof tc.expectedOutput === "string" ? tc.expectedOutput : JSON.stringify(tc.expectedOutput ?? "")}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab Content: Submissions Log */}
            <TabsContent
              value="submissions"
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 m-0"
            >
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Audit Trail
              </h3>

              {loadingSubmissions ? (
                <p className="text-xs text-zinc-500">Retrieving submission logs...</p>
              ) : submissions.length === 0 ? (
                <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-8 text-center text-xs text-zinc-500">
                  No submissions recorded yet for this challenge.
                </div>
              ) : (
                <div className="space-y-2">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="rounded-lg border border-white/[0.06] bg-zinc-900/60 p-3 flex items-center justify-between hover:border-white/[0.12] transition-colors"
                    >
                      <div>
                        <div>{getVerdictBadge(sub.status)}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-1">
                          {new Date(sub.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        {sub.executionTime != null && (
                          <div className="font-mono text-zinc-400 text-[11px]">
                            {sub.executionTime}ms
                          </div>
                        )}
                        {sub.failedTestCase != null && (
                          <div className="text-rose-400 text-[10px] font-mono">
                            Test #{sub.failedTestCase}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ResizablePanel>

        {/* Resizable Divider Handle */}
        <ResizableHandle withHandle={isDesktop} />

        {/* -----------------------------------------------------------------
            RIGHT PANE: Monaco Code Editor + Bottom Console Drawer
        ----------------------------------------------------------------- */}
        <ResizablePanel
          id="problem-editor-panel"
          defaultSize={isDesktop ? 50 : 55}
          minSize={isDesktop ? 25 : 20}
          className="flex flex-col bg-zinc-950 overflow-hidden"
        >
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 h-10 bg-zinc-900/60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded tracking-wider">
                C++ 17 (GCC)
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetCode}
              title="Reset boilerplate starter code"
              className="h-7 text-[11px] text-zinc-400 hover:text-white px-2 gap-1"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </Button>
          </div>

          {/* Monaco Code Editor Canvas */}
          <div className="flex-1 relative min-h-[160px] overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="cpp"
              language="cpp"
              theme="vs-dark"
              value={code}
              onMount={handleEditorMount}
              onChange={(val) => setCode(val || "")}
              options={{
                fontSize: 13.5,
                lineHeight: 22,
                fontFamily: "'JetBrains Mono', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: "on",
                renderLineHighlight: "all",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                bracketPairColorization: { enabled: true },
                formatOnPaste: true,
              }}
            />
          </div>

          {/* Bottom Console / Verdict Drawer */}
          <div className="h-56 sm:h-64 border-t border-white/[0.08] bg-zinc-950 flex flex-col flex-shrink-0 overflow-hidden">
            <Tabs
              value={bottomTab}
              onValueChange={setBottomTab}
              className="flex flex-col h-full overflow-hidden"
            >
              {/* Drawer Toolbar */}
              <div className="flex flex-wrap items-center justify-between border-b border-white/[0.08] px-4 py-1.5 sm:py-0 sm:h-10 bg-zinc-900/80 gap-2 flex-shrink-0">
                <TabsList className="bg-transparent p-0">
                  <TabsTrigger value="testcase">Sample Input</TabsTrigger>
                  <TabsTrigger value="verdict">Verdict & Output</TabsTrigger>
                </TabsList>

                {/* Primary Submit Action (Responsive: full-width on mobile xs, auto on sm+) */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-7 text-xs font-semibold px-4 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <Play size={11} className="fill-current mr-1.5" />
                      <span>Submit Code</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Drawer Content: Sample Input */}
              <TabsContent
                value="testcase"
                className="flex-1 overflow-y-auto p-4 text-xs font-mono m-0"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider block font-sans">
                    Standard Input (stdin passed to container):
                  </span>
                  <pre className="bg-zinc-900 border border-white/[0.06] p-3 rounded-lg text-zinc-200 overflow-x-auto">
                    {testCases[0]?.input != null
                      ? typeof testCases[0].input === "string"
                        ? testCases[0].input
                        : JSON.stringify(testCases[0].input)
                      : "No test input provided."}
                  </pre>
                </div>
              </TabsContent>

              {/* Drawer Content: Verdict Banner & Diagnostics */}
              <TabsContent
                value="verdict"
                className="flex-1 overflow-y-auto p-4 text-xs m-0"
              >
                {!activeSubmission ? (
                  <p className="text-zinc-500 text-xs">
                    Dispatch your code via &quot;Submit Code&quot; to compile and execute inside the sandbox.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <div>{getVerdictBadge(activeSubmission.status)}</div>

                      {activeSubmission.executionTime != null && (
                        <div className="font-mono text-[11px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-white/[0.06]">
                          Runtime:{" "}
                          <span className="text-emerald-400 font-semibold">
                            {activeSubmission.executionTime}ms
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Semantic Alert Banners */}
                    {activeSubmission.status === "ACCEPTED" && (
                      <Alert variant="success">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Accepted</AlertTitle>
                        <AlertDescription>
                          All test cases passed within CPU and memory resource constraints.
                        </AlertDescription>
                      </Alert>
                    )}

                    {activeSubmission.status === "WRONG_ANSWER" && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Wrong Answer</AlertTitle>
                        <AlertDescription>
                          Output mismatch detected on Test Case #{activeSubmission.failedTestCase || 1}.
                        </AlertDescription>
                      </Alert>
                    )}

                    {activeSubmission.status === "TIME_LIMIT_EXCEEDED" && (
                      <Alert variant="warning">
                        <Clock className="h-4 w-4" />
                        <AlertTitle>Time Limit Exceeded</AlertTitle>
                        <AlertDescription>
                          Execution exceeded the {timeLimit}ms quota and was terminated by the watchdog.
                        </AlertDescription>
                      </Alert>
                    )}

                    {activeSubmission.status === "MEMORY_LIMIT_EXCEEDED" && (
                      <Alert variant="purple">
                        <Cpu className="h-4 w-4" />
                        <AlertTitle>Memory Limit Exceeded</AlertTitle>
                        <AlertDescription>
                          Allocations exceeded the {memoryLimit}MB cgroup quota and was terminated by OOM killer.
                        </AlertDescription>
                      </Alert>
                    )}

                    {activeSubmission.status === "COMPILATION_ERROR" && activeSubmission.errorMessage && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-orange-400 block tracking-wide font-mono">
                          GCC Compiler Diagnostics:
                        </span>
                        <pre className="bg-zinc-900 border border-orange-500/20 p-3 rounded-lg text-orange-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {activeSubmission.errorMessage}
                        </pre>
                      </div>
                    )}

                    {activeSubmission.status === "RUNTIME_ERROR" && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-rose-400 block tracking-wide font-mono">
                          Runtime Signal Diagnostics:
                        </span>
                        <pre className="bg-zinc-900 border border-rose-500/20 p-3 rounded-lg text-rose-300 font-mono text-[11px] overflow-x-auto">
                          {activeSubmission.errorMessage || "Process terminated abnormally (SIGSEGV or SIGFPE)."}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
