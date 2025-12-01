"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return (
    <div className="flex flex-col gap-8 w-full max-w-lg mx-auto h-screen justify-center items-center px-4">
      <div className="text-center flex flex-col items-center gap-4">
        <div className="flex items-center gap-6">
          <Image
            src="/convex.svg"
            alt="Convex Logo"
            width={90}
            height={90}
          />
          <div className="w-px h-20 bg-border"></div>
          <Image
            src="/nextjs-icon-light-background.svg"
            alt="Next.js Logo"
            width={90}
            height={90}
            className="dark:hidden"
          />
          <Image
            src="/nextjs-icon-dark-background.svg"
            alt="Next.js Logo"
            width={90}
            height={90}
            className="hidden dark:block"
          />
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          PetShop Management System
        </h1>
        <p className="text-muted-foreground">
          Sign in to access the system. User accounts are created by administrators only.
        </p>
      </div>
      <form
        className="flex flex-col gap-4 w-full bg-card p-8 rounded-2xl shadow-xl border border-border"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", "signIn"); // Always use signIn flow
          void signIn("password", formData)
            .catch((error) => {
              setError(error.message);
              setLoading(false);
            })
            .then(() => {
              router.push("/");
            });
        }}
      >
        <input
          className="bg-background text-foreground rounded-lg p-3 border border-input focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none transition-all placeholder:text-muted-foreground"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="bg-background text-foreground rounded-lg p-3 border border-input focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none transition-all placeholder:text-muted-foreground"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg py-3 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 dark:border-rose-500/50 rounded-lg p-4">
            <p className="text-destructive font-medium text-sm break-words">
              Error: {error}
            </p>
          </div>
        )}
        <p className="text-xs text-center text-muted-foreground mt-2">
          Don&apos;t have an account? Contact your administrator.
        </p>
      </form>
    </div>
  );
}
