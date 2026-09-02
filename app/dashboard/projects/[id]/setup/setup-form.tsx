"use client";

import { useRef, useState } from "react";

interface SetupFormProps {
  projectId: string;
  initialPermissionsConfig: string;
  initialUserAEmail: string;
  initialUserAPassword: string;
  initialUserBEmail: string;
  initialUserBPassword: string;
  saveAction: (formData: FormData) => Promise<void>;
}

const inputClass =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-black focus:outline-none";

const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function SetupForm({
  projectId,
  initialPermissionsConfig,
  initialUserAEmail,
  initialUserAPassword,
  initialUserBEmail,
  initialUserBPassword,
  saveAction,
}: SetupFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    // Validate JSON client-side first
    const raw = formData.get("permissions_config") as string;
    try {
      JSON.parse(raw);
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
      return;
    }

    setSaving(true);
    try {
      await saveAction(formData);
      // If we get here without redirect, something went wrong
    } catch (e) {
      // Next.js redirect() throws a special error that should propagate
      // without being caught. Re-throw redirect errors so navigation works.
      const err = e as Error & { digest?: string };
      if (err.digest?.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      setJsonError(err.message || "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-8">
      <input type="hidden" name="projectId" value={projectId} />

      {/* ── User A credentials ─────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">User A (Test Account)</h2>
        <p className="text-xs text-gray-500">
          A real user in the target Supabase project that will be signed in to
          test permissions.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="userAEmail" className={labelClass}>
              Email
            </label>
            <input
              id="userAEmail"
              name="userAEmail"
              type="email"
              required
              defaultValue={initialUserAEmail}
              placeholder="usera@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="userAPassword" className={labelClass}>
              Password
            </label>
            <input
              id="userAPassword"
              name="userAPassword"
              type="password"
              required
              defaultValue={initialUserAPassword}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* ── User B credentials ─────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">User B (Second Test Account)</h2>
        <p className="text-xs text-gray-500">
          Optional — for cross-user permission tests.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="userBEmail" className={labelClass}>
              Email
            </label>
            <input
              id="userBEmail"
              name="userBEmail"
              type="email"
              defaultValue={initialUserBEmail}
              placeholder="userb@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="userBPassword" className={labelClass}>
              Password
            </label>
            <input
              id="userBPassword"
              name="userBPassword"
              type="password"
              defaultValue={initialUserBPassword}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* ── Permissions config ──────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Permissions Config</h2>
        <p className="text-xs text-gray-500">
          Define which actions are expected to be allowed or denied per table.
          Each table entry can list <code>allowed</code> actions and explicit{" "}
          <code>rules</code> with expected outcomes.
        </p>
        <div>
          <label htmlFor="permissions_config" className={labelClass}>
            JSON Config
          </label>
          <textarea
            id="permissions_config"
            name="permissions_config"
            rows={16}
            required
            defaultValue={initialPermissionsConfig}
            spellCheck={false}
            className={`${inputClass} font-mono text-xs leading-relaxed`}
          />
        </div>
        {jsonError && (
          <p className="text-sm text-red-600">
            Invalid JSON: {jsonError}
          </p>
        )}
      </section>

      {/* ── Save button ─────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Configuration"}
        </button>
      </div>
    </form>
  );
}


