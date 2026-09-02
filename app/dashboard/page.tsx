import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";
import InstructionsButton from "./instructions-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const email = data.claims.email ?? "unknown";

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="mt-1 text-sm text-gray-500">{email}</p>
          </div>
          <div className="flex items-center gap-2">
            <InstructionsButton />
            <LogoutButton />
          </div>
        </div>

        <Link
          href="/dashboard/new-project"
          className="inline-block rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          New Project
        </Link>

        {projects && projects.length > 0 ? (
          <ul className="divide-y rounded border">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
                >
                  <span className="font-medium">{project.name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            No projects yet. Click &ldquo;New Project&rdquo; to create one.
          </p>
        )}
      </div>
    </main>
  );
}
