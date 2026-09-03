import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <h1
          className="text-center text-2xl font-bold"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          Welcome
        </h1>
        <LoginForm />
      </div>
    </main>
  );
}
