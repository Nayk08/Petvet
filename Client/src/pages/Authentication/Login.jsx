import AuthForm from "../Authentication/components/AuthForm";

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50 px-4 relative antialiased">
      {/* Background Glow */}
      <AuthForm />
    </div>
  );
}
