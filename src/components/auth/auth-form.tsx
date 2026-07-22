"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import {
  forgotPassword,
  signIn,
  signUp,
  type AuthActionState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed:
    "Authentication failed. The link may have expired. Please try again.",
  account_inactive:
    "Your account could not be loaded. If you just signed up, confirm your email or ask an admin to activate your account.",
  profile_setup_failed:
    "Your login worked but the app profile is missing. Run the Supabase database migrations, then try signing in again.",
  unauthorized: "You do not have permission to access that page.",
};

interface AuthFormProps {
  mode: "login" | "register" | "forgot-password";
  redirectTo?: string;
  errorCode?: string;
}

const initialState: AuthActionState = {};

export function AuthForm({ mode, redirectTo, errorCode }: AuthFormProps) {
  const action =
    mode === "login" ? signIn : mode === "register" ? signUp : forgotPassword;

  const [state, formAction, pending] = useActionState(action, initialState);

  const titles = {
    login: "Welcome back",
    register: "Create your account",
    "forgot-password": "Reset password",
  };

  const descriptions = {
    login: "Sign in to access your BuildView portal",
    register: "Start monitoring your construction projects",
    "forgot-password": "We'll email you a link to reset your password",
  };

  const urlError = errorCode ? ERROR_MESSAGES[errorCode] : null;
  const displayError = state.error ?? urlError;

  return (
    <AuthShell>
      <div>
        <h2 className="font-display text-2xl font-bold text-brand-primary dark:text-white">
          {titles[mode]}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{descriptions[mode]}</p>

        <form action={formAction} className="mt-8 space-y-4">
          {mode === "login" && redirectTo && (
            <input type="hidden" name="redirect" value={redirectTo} />
          )}

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="John Smith"
                autoComplete="name"
                required
                className="h-11"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
              className="h-11"
            />
          </div>

          {mode !== "forgot-password" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "login" && (
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-brand-accent-dark hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <PasswordInput
                id="password"
                name="password"
                placeholder="••••••••"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                minLength={mode === "register" ? 8 : 6}
              />
            </div>
          )}

          {displayError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {displayError}
            </div>
          )}

          {state.success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
              {state.success}
            </div>
          )}

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full shadow-soft"
            disabled={pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" && "Sign in"}
            {mode === "register" && "Create account"}
            {mode === "forgot-password" && "Send reset link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "login" && (
            <>
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-brand-accent-dark hover:underline"
              >
                Sign up
              </Link>
            </>
          )}
          {mode === "register" && (
            <>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-brand-accent-dark hover:underline"
              >
                Sign in
              </Link>
            </>
          )}
          {mode === "forgot-password" && (
            <Link
              href="/login"
              className="font-semibold text-brand-accent-dark hover:underline"
            >
              Back to sign in
            </Link>
          )}
        </p>
      </div>
    </AuthShell>
  );
}
