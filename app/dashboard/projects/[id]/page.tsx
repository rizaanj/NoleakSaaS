import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { runTests } from "@/lib/testing/run-tests";
import RunTestsForm from "./run-tests-form";
import DeleteProjectButton from "./delete-project-button";
import ProjectNav from "./project-nav";

export const dynamic = "force-dynamic";

// ── Server action: run tests ───────────────────────────────────────────
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
      error:
        "Test credentials are not configured. Please set them up first.",
    };
  }

  try {
    await runTests(projectId, userAEmail, userAPassword);
  } catch (e) {
    return { error: (e as Error).message ?? "Tests failed with an unknown error." };
  }

  redirect(`/dashboard/projects/${projectId}/results`);
}

// ── Server action: delete project ──────────────────────────────────────
async function deleteProject(formData: FormData) {
  "use server";

  const projectId = formData.get("projectId") as string;
  const supabase = await createClient();

  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard");
}

// ── Page component ───────────────────────────────────────────────────────
export default async function ProjectPage({
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

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, test_credentials")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  const { data: priorRuns } = await supabase
    .from("test_runs")
    .select("id")
    .eq("project_id", id)
    .limit(1);

  const hasPriorRuns = Boolean(priorRuns && priorRuns.length > 0);

  const tc = (project.test_credentials ?? {}) as Record<
    string,
    { email?: string; password?: string }
  >;
  const userAEmail = tc.userA?.email ?? "";
  const userAPassword = tc.userA?.password ?? "";
  const hasCredentials = Boolean(userAEmail && userAPassword);

  const runButton = hasCredentials ? (
    <RunTestsForm
      runProjectTests={runProjectTests}
      projectId={id}
      userAEmail={userAEmail}
      userAPassword={userAPassword}
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
          {/* Page actions */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {project.name}
            </h1>
            <div className="flex items-center gap-2">
              <DeleteProjectButton
                deleteAction={deleteProject}
                projectId={id}
                projectName={project.name}
              />
            </div>
          </div>

          {/* Credentials warning */}
          {!hasCredentials && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Test credentials are not configured yet.{" "}
              <Link
                href={`/dashboard/projects/${id}/setup`}
                className="font-medium underline"
              >
                Set them up
              </Link>{" "}
              before running tests.
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href={`/dashboard/projects/${id}/setup`}
              className="rounded-lg border border-gray-200 bg-white p-4 text-center hover:bg-gray-50"
            >
              <p className="text-sm font-semibold text-gray-900">Setup</p>
              <p className="mt-1 text-xs text-gray-500">
                Configure test credentials & permissions
              </p>
            </Link>
            <Link
              href={`/dashboard/projects/${id}/results`}
              className="rounded-lg border border-gray-200 bg-white p-4 text-center hover:bg-gray-50"
            >
              <p className="text-sm font-semibold text-gray-900">Results</p>
              <p className="mt-1 text-xs text-gray-500">
                View past test run results
              </p>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
