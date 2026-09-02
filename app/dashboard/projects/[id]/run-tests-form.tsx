"use client";

import { useActionState } from "react";

type RunTestsAction = (
  prevState: { error: string | null },
  formData: FormData,
) => Promise<{ error: string | null }>;

interface RunTestsFormProps {
  runProjectTests: RunTestsAction;
  projectId: string;
  userAEmail: string;
  userAPassword: string;
  hasPriorRuns: boolean;
}

export default function RunTestsForm({
  runProjectTests,
  projectId,
  userAEmail,
  userAPassword,
  hasPriorRuns,
}: RunTestsFormProps) {
  const [state, formAction, isPending] = useActionState(runProjectTests, {
    error: null,
  });

  return (
    <>
      <form action={formAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="userAEmail" value={userAEmail} />
        <input type="hidden" name="userAPassword" value={userAPassword} />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending
            ? "Running…"
            : hasPriorRuns
              ? "Run Again"
              : "Run Tests"}
        </button>
      </form>

      {state.error && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {state.error}
        </div>
      )}
    </>
  );
}
