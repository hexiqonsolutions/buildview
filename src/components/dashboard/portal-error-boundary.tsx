"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PortalErrorBoundaryProps {
  children: ReactNode;
}

interface PortalErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class PortalErrorBoundary extends Component<
  PortalErrorBoundaryProps,
  PortalErrorBoundaryState
> {
  state: PortalErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): PortalErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Something went wrong loading the portal.";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    console.error("[PortalErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-xl font-semibold text-brand-primary dark:text-white">
              Portal failed to load
            </h2>
            <p className="mt-2 text-sm text-slate-500">{this.state.message}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="accent" onClick={() => this.setState({ hasError: false, message: "" })}>
                Try again
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">Back to login</Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
