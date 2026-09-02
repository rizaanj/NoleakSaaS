"use client";

import { useState } from "react";

export default function InstructionsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        How it works
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-4 max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                How to use NoLeak
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-gray-700">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                  1
                </span>
                <div>
                  <p className="font-semibold">Create a project</p>
                  <p className="text-gray-500">
                    Click &ldquo;New Project&rdquo; and give it a name. This
                    represents the Supabase app you want to test.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                  2
                </span>
                <div>
                  <p className="font-semibold">Set up credentials</p>
                  <p className="text-gray-500">
                    Click your project, then go to the <strong>Setup</strong>{" "}
                    tab. Enter a test user&apos;s email and password from your
                    Supabase app, and paste in your permissions config (a JSON
                    file that defines which actions should be allowed or denied
                    on each table).
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                  3
                </span>
                <div>
                  <p className="font-semibold">Run the tests</p>
                  <p className="text-gray-500">
                    Press <strong>Run Tests</strong> (or <strong>Run Again</strong>).
                    NoLeak will sign in as your test user and try to read,
                    edit, and delete data in each table.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                  4
                </span>
                <div>
                  <p className="font-semibold">Check the results</p>
                  <p className="text-gray-500">
                    Go to the <strong>Results</strong> tab. Each test tells you
                    if it <strong>Passed</strong> or needs{" "}
                    <strong>Review</strong>. Passed means your security rules
                    worked correctly. Review means something unexpected happened
                    and you should check it.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded bg-black py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
