import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestResult {
  table: string;
  action: "read" | "edit" | "delete";
  expectedResult: "allowed" | "denied";
  actualResult: "allowed" | "denied";
  status: "pass" | "needs-review";
  rawResponse: unknown;
}

interface TableRule {
  allowed?: string[];
  rules?: { action: string; expected: string }[];
}

// ---------------------------------------------------------------------------
// Core runner
// ---------------------------------------------------------------------------

export async function runTests(
  projectId: string,
  userAEmail: string,
  userAPassword: string,
): Promise<TestResult[]> {
  // 1. Fetch the project's config from our own database (server-side, RLS-safe)
  const serverSupabase = await createServerClient();
  const { data: project, error: projectError } = await serverSupabase
    .from("projects")
    .select("supabase_url, supabase_anon_key, permissions_config")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error(
      `Failed to fetch project: ${projectError?.message ?? "not found"}`,
    );
  }

  const permissionsConfig = project.permissions_config as Record<
    string,
    TableRule
  > | null;

  if (!permissionsConfig || typeof permissionsConfig !== "object") {
    throw new Error(
      "permissions_config is missing or invalid. Set it up on the project settings page first.",
    );
  }

  // 2. Create a Supabase client pointed at the TARGET project
  const targetClient = createClient(
    project.supabase_url,
    project.supabase_anon_key,
  );

  // 3. Sign in as User A
  const { error: signInError } = await targetClient.auth.signInWithPassword({
    email: userAEmail,
    password: userAPassword,
  });

  if (signInError) {
    throw new Error(`Sign-in failed: ${signInError.message}`);
  }

  // 4 & 5. Iterate over permissions_config, test each rule, compare results
  const results: TestResult[] = [];

  const tables = Object.keys(permissionsConfig);

  for (const tableName of tables) {
    const tableConfig = permissionsConfig[tableName];
    const allowedActions = new Set(tableConfig.allowed ?? []);

    // Derive specific rules (e.g. explicit expected results per action)
    const explicitRules = new Map<string, string>();
    if (Array.isArray(tableConfig.rules)) {
      for (const r of tableConfig.rules) {
        explicitRules.set(r.action, r.expected);
      }
    }

    const actionsToTest: Array<"read" | "edit" | "delete"> = [
      "read",
      "edit",
      "delete",
    ];

    for (const action of actionsToTest) {
      // Determine expected outcome
      const explicit = explicitRules.get(action);
      const expectedResult: "allowed" | "denied" =
        explicit === "allowed" || explicit === "denied"
          ? explicit
          : allowedActions.has(action)
            ? "allowed"
            : "denied";

      let response: { data: unknown; error: { message: string } | null };

      switch (action) {
        case "read":
          response = await targetClient.from(tableName).select("*").limit(1);
          break;

        case "edit": {
          // Try to update a row; if none exist the error is still informative.
          // We use a dummy PK to force a permission check before a not-found error.
          response = await targetClient
            .from(tableName)
            .update({ updated_at: new Date().toISOString() })
            .eq("id", "00000000-0000-0000-0000-000000000000");
          break;
        }

        case "delete":
          // Same strategy: use a dummy PK so Supabase checks RLS first.
          response = await targetClient
            .from(tableName)
            .delete()
            .eq("id", "00000000-0000-0000-0000-000000000000");
          break;
      }

      const actualResult: "allowed" | "denied" = response.error
        ? "denied"
        : "allowed";
      const status: "pass" | "needs-review" =
        actualResult === expectedResult ? "pass" : "needs-review";

      results.push({
        table: tableName,
        action,
        expectedResult,
        actualResult,
        status,
        rawResponse: response,
      });
    }
  }

  // 7. Insert a new row into test_runs
  const { error: insertError } = await serverSupabase
    .from("test_runs")
    .insert({
      project_id: projectId,
      results,
      status: results.every((r) => r.status === "pass") ? "pass" : "needs-review",
    });

  if (insertError) {
    console.error("Failed to record test run:", insertError.message);
  }

  return results;
}
