import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function createProject(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;
  const name = formData.get("name") as string;
  const supabaseUrl = formData.get("supabase_url") as string;
  const supabaseAnonKey = formData.get("supabase_anon_key") as string;

  if (!name || !supabaseUrl || !supabaseAnonKey) {
    throw new Error("All fields are required.");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name,
      supabase_url: supabaseUrl,
      supabase_anon_key: supabaseAnonKey,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/dashboard/projects/${project.id}`);
}

export default async function NewProjectPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-md space-y-6 px-4">
        <h1 className="text-2xl font-bold text-center">New Project</h1>

        <form action={createProject} className="space-y-4">
          <input type="hidden" name="user_id" value={data.claims.sub} />

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Project Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="My App"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-black focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="supabase_url"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Supabase Project URL
            </label>
            <input
              id="supabase_url"
              name="supabase_url"
              type="url"
              required
              placeholder="https://your-project.supabase.co"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-black focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="supabase_anon_key"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Supabase Anon Key
            </label>
            <input
              id="supabase_anon_key"
              name="supabase_anon_key"
              type="text"
              required
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-black focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create Project
          </button>
        </form>
      </div>
    </main>
  );
}
