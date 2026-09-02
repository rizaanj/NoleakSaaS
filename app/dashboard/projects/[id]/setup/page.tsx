import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetupForm from "./setup-form";
import ProjectNav from "../project-nav";

// Default permissions_config template for new projects
const DEFAULT_PERMISSIONS_CONFIG = JSON.stringify(
  {
    orders: {
      allowed: ["read"],
      rules: [
        { action: "read", expected: "allowed", "detail": "Users can view their own orders" },
        { action: "create", expected: "allowed", "detail": "Users can create new orders" },
        { action: "edit", expected: "denied", "detail": "Only admins can edit orders" },
        { action: "delete", expected: "denied", "detail": "Only admins can delete orders" },
      ],
    },
  },
  null,
  2,
);

async function saveProjectConfig(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const projectId = formData.get("projectId") as string;
  const userAEmail = formData.get("userAEmail") as string;
  const userAPassword = formData.get("userAPassword") as string;
  const userBEmail = formData.get("userBEmail") as string;
  const userBPassword = formData.get("userBPassword") as string;
  const permissionsConfigRaw = formData.get("permissions_config") as string;

  let permissionsConfig: unknown;
  try {
    permissionsConfig = JSON.parse(permissionsConfigRaw);
  } catch {
    throw new Error("permissions_config must be valid JSON.");
  }

  const testCredentials = {
    userA: { email: userAEmail, password: userAPassword },
    userB: { email: userBEmail, password: userBPassword },
  };

  const { error } = await supabase
    .from("projects")
    .update({
      permissions_config: permissionsConfig,
      test_credentials: testCredentials,
    })
    .eq("id", projectId);

  if (error) {
    throw new Error(`Failed to save: ${error.message}`);
  }

  redirect(`/dashboard/projects/${projectId}`);
}

export default async function SetupPage({
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
    .select("id, name, permissions_config, test_credentials")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  const tc = (project.test_credentials ?? {}) as Record<
    string,
    { email?: string; password?: string }
  >;
  const pc = project.permissions_config
    ? JSON.stringify(project.permissions_config, null, 2)
    : DEFAULT_PERMISSIONS_CONFIG;

  const hasCredentials = Boolean(tc.userA?.email && tc.userA?.password);

  return (
    <>
      <ProjectNav
        projectId={id}
        projectName={project.name}
        hasCredentials={hasCredentials}
        hasPriorRuns={false}
      />

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-8">
          <div>
            <h1 className="text-2xl font-bold">Project Setup</h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure test credentials and permission rules for{" "}
              <span className="font-medium text-gray-700">{project.name}</span>.
            </p>
          </div>

          <SetupForm
            projectId={project.id}
            initialPermissionsConfig={pc}
            initialUserAEmail={tc.userA?.email ?? ""}
            initialUserAPassword={tc.userA?.password ?? ""}
            initialUserBEmail={tc.userB?.email ?? ""}
            initialUserBPassword={tc.userB?.password ?? ""}
            saveAction={saveProjectConfig}
          />
        </div>
      </main>
    </>
  );
}
