"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function AdminSetup() {
    const { signIn } = useAuthActions();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const adminExists = useQuery(api.users.createAdminAccount.checkAnyAdminExists);

    if (adminExists === undefined) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (adminExists) {
        return (
            <div className="flex flex-col gap-8 w-full max-w-lg mx-auto h-screen justify-center items-center px-4">
                <div className="text-center flex flex-col items-center gap-4">
                    <div className="bg-green-100 text-green-800 p-4 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                        Setup Complete
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        An administrator account has already been created.
                        <br />
                        For security reasons, this setup page is now disabled.
                    </p>
                    <Link
                        href="/signin"
                        className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        Go to Sign In
                    </Link>
                </div>
            </div>
        );
    }

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
                    <div className="w-px h-20 bg-slate-300 dark:bg-slate-600"></div>
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
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                    Admin Setup
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Create the initial Administrator account.
                </p>
            </div>
            <form
                className="flex flex-col gap-4 w-full bg-slate-100 dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-300 dark:border-slate-600"
                onSubmit={(e) => {
                    e.preventDefault();
                    setLoading(true);
                    setError(null);
                    const formData = new FormData(e.target as HTMLFormElement);
                    formData.set("flow", "signUp"); // FORCE SIGNUP
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
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm mb-4">
                    <strong>Warning:</strong> This page allows creating new accounts.
                    It should be disabled or protected after the initial setup.
                </div>

                <input
                    className="bg-white dark:bg-slate-900 text-foreground rounded-lg p-3 border border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 outline-none transition-all placeholder:text-slate-400"
                    type="email"
                    name="email"
                    placeholder="Email"
                    required
                />
                <input
                    className="bg-white dark:bg-slate-900 text-foreground rounded-lg p-3 border border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 outline-none transition-all placeholder:text-slate-400"
                    type="password"
                    name="password"
                    placeholder="Password"
                    required
                />
                <button
                    className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-semibold rounded-lg py-3 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Creating Account..." : "Create Admin Account"}
                </button>
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 dark:border-rose-500/50 rounded-lg p-4">
                        <p className="text-rose-700 dark:text-rose-300 font-medium text-sm break-words">
                            Error: {error}
                        </p>
                    </div>
                )}
            </form>
        </div>
    );
}
