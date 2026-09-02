import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestResult {
  table: string;
  action: string;
  expectedResult: string;
  actualResult: string;
  status: "pass" | "needs-review";
  detail: string;
  rawResponse: unknown;
}

interface TableRule {
  allowed?: string[];
  rules?: { action: string; expected: string; detail?: string }[];
}

interface PermissionsConfig {
  [tableName: string]: TableRule;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPermissionError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("permission") ||
    lower.includes("policy") ||
    lower.includes("rls") ||
    lower.includes("not allowed") ||
    lower.includes("violates row-level security") ||
    lower.includes("denied")
  );
}

function extractRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  return [];
}

/**
 * If the returned rows all share a field like user_id / owner_id / author_id
 * that matches the given userId, the data is scoped correctly.
 * Returns null if we can't determine ownership (no standard field found).
 */
function checkOwnership(
  rows: unknown[],
  userId: string,
): boolean | null {
  if (rows.length === 0) return null; // empty — can't tell
  const ownershipFields = [
    "user_id",
    "owner_id",
    "author_id",
    "created_by",
    "profile_id",
  ];
  const sample = rows[0] as Record<string, unknown>;
  for (const field of ownershipFields) {
    if (field in sample) {
      return rows.every((r) => (r as Record<string, unknown>)[field] === userId);
    }
  }
  return null; // no ownership column found
}

// ---------------------------------------------------------------------------
// Core runner
// ---------------------------------------------------------------------------

export async function runTests(
  projectId: string,
  userAEmail: string,
  userAPassword: string,
): Promise<TestResult[]> {
  // 1. Fetch project config
  const serverSupabase = await createServerClient();
  const { data: project, error: projectError } = await serverSupabase
    .from("projects")
    .select("supabase_url, supabase_anon_key, permissions_config, test_credentials")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error(
      `Failed to fetch project: ${projectError?.message ?? "not found"}`,
    );
  }

  const permissionsConfig = project.permissions_config as PermissionsConfig | null;
  if (!permissionsConfig || typeof permissionsConfig !== "object") {
    throw new Error(
      "permissions_config is missing. Set it up on the Setup page first.",
    );
  }

  // 2. Create Supabase client pointed at TARGET project
  const targetClient = createClient(
    project.supabase_url,
    project.supabase_anon_key,
  );

  // 3. Sign in as User A
  const { data: signInData, error: signInError } =
    await targetClient.auth.signInWithPassword({
      email: userAEmail,
      password: userAPassword,
    });

  if (signInError) {
    throw new Error(`Sign-in failed: ${signInError.message}`);
  }

  const userAId = signInData.user.id;

  // Optional: sign in as User B for cross-user tests
  const tc = (project.test_credentials ?? {}) as Record<
    string,
    { email?: string; password?: string }
  >;
  let targetClientB: ReturnType<typeof createClient> | null = null;
  let userBId: string | null = null;

  if (tc.userB?.email && tc.userB?.password) {
    targetClientB = createClient(
      project.supabase_url,
      project.supabase_anon_key,
    );
    const { data: signInB, error: signInBErr } =
      await targetClientB.auth.signInWithPassword({
        email: tc.userB.email,
        password: tc.userB.password,
      });
    if (!signInBErr && signInB?.user) {
      userBId = signInB.user.id;
    }
  }

  // 4 & 5. Test each rule
  const results: TestResult[] = [];
  const tables = Object.keys(permissionsConfig);

  for (const tableName of tables) {
    const tableConfig = permissionsConfig[tableName];
    const allowedActions = new Set(tableConfig.allowed ?? []);

    // Build explicit rules map
    const explicitRules = new Map<string, { expected: string; detail?: string }>();
    if (Array.isArray(tableConfig.rules)) {
      for (const r of tableConfig.rules) {
        explicitRules.set(r.action, { expected: r.expected, detail: r.detail });
      }
    }

    const actionsToTest = ["read", "edit", "delete", "create"];

    for (const action of actionsToTest) {
      // Skip if no rule defined for this action
      const explicit = explicitRules.get(action);
      const hasRule = explicit || allowedActions.has(action) || action === "read";
      if (!hasRule) continue;

      const expectedResult =
        explicit?.expected === "allowed" || explicit?.expected === "denied"
          ? explicit.expected
          : allowedActions.has(action)
            ? "allowed"
            : "denied";

      let response: { data: unknown; error: { message: string; code?: string } | null };
      let detail = "";

      try {
        switch (action) {
          case "read": {
            response = await targetClient
              .from(tableName)
              .select("*")
              .limit(5);

            // Check if returned data leaks other users' rows
            if (!response.error && response.data) {
              const rows = extractRows(response.data);
              const ownershipCheck = checkOwnership(rows, userAId);
              if (ownershipCheck === false) {
                detail =
                  "SECURITY ISSUE: Returned rows belong to other users — data is leaking across accounts";
              } else if (ownershipCheck === true && rows.length > 0) {
                detail = "Rows are correctly scoped to the signed-in user";
              }
            }
            break;
          }

          case "edit": {
            // Try updating with a dummy ID — should get RLS block or not-found
            response = await targetClient
              .from(tableName)
              .update({ updated_at: new Date().toISOString() })
              .eq("id", "00000000-0000-0000-0000-000000000000");
            break;
          }

          case "delete": {
            response = await targetClient
              .from(tableName)
              .delete()
              .eq("id", "00000000-0000-0000-0000-000000000000");
            break;
          }

          case "create": {
            // Try inserting a test row — should be blocked by RLS if not allowed
            response = await targetClient
              .from(tableName)
              .insert({
                created_at: new Date().toISOString(),
                _test_insert: true,
              })
              .select()
              .single();

            // If insert succeeded, clean it up
            if (!response.error && (response.data as Record<string, unknown>)?.id) {
              const insertedId = (response.data as Record<string, unknown>).id;
              await targetClient.from(tableName).delete().eq("id", insertedId);
              detail = "Insert succeeded — row was created and cleaned up";
            }
            break;
          }

          default:
            continue;
        }
      } catch (e) {
        response = { data: null, error: { message: (e as Error).message } };
      }

      const hasError = Boolean(response.error);
      const isPerm = hasError && isPermissionError(response.error!.message);

      let actualResult: string;
      if (hasError && isPerm) {
        actualResult = "denied"; // RLS blocked it
      } else if (hasError) {
        actualResult = "error"; // some other error
      } else {
        actualResult = "allowed";
      }

      const status: "pass" | "needs-review" =
        actualResult === expectedResult ? "pass" : "needs-review";

      // Enhance detail for common issues
      if (!detail) {
        if (status === "needs-review" && expectedResult === "denied" && actualResult === "allowed") {
          detail =
            "This action was allowed but should be denied — your RLS policy may be missing or misconfigured";
        } else if (status === "needs-review" && expectedResult === "allowed" && actualResult === "denied") {
          detail =
            "This action was blocked but should be allowed — your RLS policy may be too restrictive";
        } else if (hasError && !isPerm) {
          detail = `Unexpected error: ${response.error!.message}`;
        } else if (actualResult === "denied") {
          detail = "Blocked by RLS as expected";
        } else {
          detail = explicit?.detail ?? "";
        }
      }

      results.push({
        table: tableName,
        action,
        expectedResult,
        actualResult,
        status,
        detail,
        rawResponse: response,
      });
    }

    // ── Cross-user leak test ──────────────────────────────────────────
    if (targetClientB && userBId) {
      try {
        // Sign in as User B and try to read User A's table
        const bResponse = await targetClientB
          .from(tableName)
          .select("*")
          .limit(5);

        if (!bResponse.error && bResponse.data) {
          const rows = extractRows(bResponse.data);
          const ownershipCheck = checkOwnership(rows, userBId);
          if (ownershipCheck === false) {
            results.push({
              table: tableName,
              action: "cross-user-read",
              expectedResult: "denied",
              actualResult: "allowed",
              status: "needs-review",
              detail:
                "SECURITY ISSUE: User B can see User A's data — row-level security is not isolating users",
              rawResponse: bResponse,
            });
          }
        }
      } catch {
        // Silently skip — cross-user test is best-effort
      }
    }
  }

  // Sign back out
  await targetClient.auth.signOut();
  if (targetClientB) await targetClientB.auth.signOut();

  // 7. Insert test run record
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
