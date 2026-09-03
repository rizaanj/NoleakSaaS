"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignUp() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else if (data.session) {
      router.push("/dashboard");
      return;
    } else {
      setMessage("Check your email for a confirmation link.");
    }
    setLoading(false);
  }

  async function handleLogIn() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-black focus:outline-none"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-black focus:outline-none"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {message && <p className="text-sm text-green-600">{message}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleLogIn}
          disabled={loading}
          className="flex-1 rounded bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Log In"}
        </button>

        <button
          type="button"
          onClick={handleSignUp}
          disabled={loading}
          className="flex-1 rounded border border-black px-3 py-2 text-sm font-medium text-black hover:bg-gray-100 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Sign Up"}
        </button>
      </div>
    </form>
  );
}
