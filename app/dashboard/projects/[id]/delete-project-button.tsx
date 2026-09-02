"use client";

import { useRef } from "react";

type DeleteAction = (formData: FormData) => Promise<void>;

interface DeleteProjectButtonProps {
  deleteAction: DeleteAction;
  projectId: string;
  projectName: string;
}

export default function DeleteProjectButton({
  deleteAction,
  projectId,
  projectName,
}: DeleteProjectButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={deleteAction}
      className="inline"
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Delete "${projectName}"? This will permanently remove all test runs. This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <button
        type="submit"
        className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
