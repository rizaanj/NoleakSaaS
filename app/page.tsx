import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-white px-4">
      <div className="mx-auto max-w-xl space-y-8 text-center">
        <h1
          className="text-3xl font-bold text-gray-900"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          NOLEAK
        </h1>
        <p className="text-lg text-gray-600">
          Test your Supabase permissions in seconds. Find security holes before
          your users do.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Log In
          </Link>
        </div>
      </div>
    </main>
  );
}
