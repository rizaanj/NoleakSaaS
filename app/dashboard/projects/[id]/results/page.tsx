import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { runTests } from "@/lib/testing/run-tests";
import RunTestsForm from "../run-tests-form";
import ProjectNav from "../project-nav";

interface TestResult {
  table: string;
  action: string;
  expectedResult: string;
  actualResult: string;
  status: string;
  detail?: string;
  rawResponse: unknown;
}

interface TestRun {
  id: string;
  run_at: string;
  status: string;
  results: TestResult[];
}

function diffResults(current: TestResult[], previous: TestResult[]) {
  const details: string[] = [];
  const prevMap = new Map<string, TestResult>();
  for (const r of previous) {
    prevMap.set(`${r.table}:${r.action}`, r);
  }
  for (const cur of current) {
    const key = `${cur.table}:${cur.action}`;
    const prev = prevMap.get(key);
    if (!prev) {
      details.push(`${cur.table} ${cur.action} — new test added`);
    } else if (cur.status !== prev.status || cur.actualResult !== prev.actualResult) {
      const changes: string[] = [];
      if (cur.status !== prev.status) changes.push(`status changed`);
      if (cur.actualResult !== prev.actualResult) changes.push(`result changed`);
      details.push(`${cur.table} ${cur.action} — ${changes.join(", ")}`);
    }
  }
  const curMap = new Map<string, TestResult>();
  for (const r of current) curMap.set(`${r.table}:${r.action}`, r);
  for (const prev of previous) {
    if (!curMap.has(`${prev.table}:${prev.action}`)) {
      details.push(`${prev.table} ${prev.action} — removed`);
    }
  }
  return { changed: details.length > 0, count: details.length, details };
}

function friendlyAction(action: string): string {
  switch (action) {
    case "read":
      return "View";
    case "edit":
      return "Change";
    case "delete":
      return "Delete";
    case "create":
      return "Create";
    case "cross-user-read":
      return "Cross-user access";
    default:
      return action;
  }
}

function isSecurityIssue(detail?: string): boolean {
  return Boolean(detail && detail.startsWith("SECURITY ISSUE"));
}

// ── Server action: run tests (re-used on results page for Run Again) ────
async function runProjectTests(
  prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  "use server";

  const projectId = formData.get("projectId") as string;
  const userAEmail = formData.get("userAEmail") as string;
  const userAPassword = formData.get("userAPassword") as string;

  if (!userAEmail || !userAPassword) {
    return {
      error: "Test credentials are not configured. Please set them up first.",
    };
  }

  try {
    await runTests(projectId, userAEmail, userAPassword);
  } catch (e) {
    return { error: (e as Error).message ?? "Tests failed with an unknown error." };
  }

  redirect(`/dashboard/projects/${projectId}/results`);
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, test_credentials")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const { data: runs } = await supabase
    .from("test_runs")
    .select("id, run_at, status, results")
    .eq("project_id", id)
    .order("run_at", { ascending: false })
    .limit(2);

  const latestRun = runs?.[0] as TestRun | undefined;
  const previousRun = runs?.[1] as TestRun | undefined;
  const results: TestResult[] = latestRun?.results ?? [];

  const passCount = results.filter((r) => r.status === "pass").length;
  const reviewCount = results.filter((r) => r.status === "needs-review").length;
  const securityIssues = results.filter((r) => isSecurityIssue(r.detail));

  const diff = previousRun ? diffResults(results, previousRun.results ?? []) : null;

  const tc = (project.test_credentials ?? {}) as Record<
    string,
    { email?: string; password?: string }
  >;
  const hasCredentials = Boolean(tc.userA?.email && tc.userA?.password);
  const hasPriorRuns = Boolean(latestRun);

  const runButton = hasCredentials ? (
    <RunTestsForm
      runProjectTests={runProjectTests}
      projectId={id}
      userAEmail={tc.userA?.email ?? ""}
      userAPassword={tc.userA?.password ?? ""}
      hasPriorRuns={hasPriorRuns}
    />
  ) : null;

  return (
    <>
      <ProjectNav
        projectId={id}
        projectName={project.name}
        hasCredentials={hasCredentials}
        hasPriorRuns={hasPriorRuns}
        runForm={runButton}
      />

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Test Results</h1>
              {latestRun && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                  {passCount} passed
                </span>
              )}
              {reviewCount > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                  {reviewCount} need attention
                </span>
              )}
            </div>
            {latestRun && (
              <p className="text-sm text-gray-400">
                {new Date(latestRun.run_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          {!latestRun ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
              <p className="text-lg text-gray-600">No tests yet</p>
              <p className="mt-2 text-sm text-gray-400">
                Press &ldquo;Run Tests&rdquo; in the top right to get started.
              </p>
            </div>
          ) : (
            <>
              {/* Security issue banner */}
              {securityIssues.length > 0 && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4">
                  <p className="font-semibold text-red-800">
                    {securityIssues.length} security issue{securityIssues.length !== 1 ? "s" : ""} found
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-red-700">
                    {securityIssues.map((r, i) => (
                      <li key={i}>- {r.table}: {r.detail}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Change banner */}
              {diff && diff.changed && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  <p className="font-medium">
                    {diff.count} change{diff.count !== 1 ? "s" : ""} since last run
                  </p>
                  <ul className="mt-1 space-y-0.5 text-blue-700">
                    {diff.details.map((d, i) => (
                      <li key={i}>- {d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Test cards */}
              <div className="space-y-3">
                {results.map((r, i) => {
                  const passed = r.status === "pass";
                  const security = isSecurityIssue(r.detail);
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-4 ${
                        security
                          ? "border-red-300 bg-red-50"
                          : passed
                            ? "border-green-200 bg-green-50"
                            : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{r.table}</p>
                          <p className="text-sm text-gray-600">
                            Trying to {friendlyAction(r.action)} data
                          </p>
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            security
                              ? "text-red-700"
                              : passed
                                ? "text-green-700"
                                : "text-amber-700"
                          }`}
                        >
                          {security ? "Security issue" : passed ? "Passed" : "Review needed"}
                        </span>
                      </div>

                      <div className="mt-3 rounded bg-white/60 p-3 text-sm text-gray-700">
                        {r.detail ? (
                          <p>{r.detail}</p>
                        ) : passed ? (
                          <p>
                            The user was allowed to{" "}
                            {friendlyAction(r.action.toLowerCase())} — this is
                            correct.
                          </p>
                        ) : (
                          <>
                            <p>
                              Expected: <span className="font-medium">{r.expectedResult}</span>
                            </p>
                            <p>
                              Actual: <span className="font-medium">{r.actualResult}</span>
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
