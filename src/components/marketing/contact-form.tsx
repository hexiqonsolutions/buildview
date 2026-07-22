"use client";

import { useActionState, useEffect, useState } from "react";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import { submitContact, type ContactActionState } from "@/lib/actions/contact";
import { trackEvent } from "@/lib/analytics/track";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: ContactActionState = {};

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initialState);
  const [interest, setInterest] = useState("");

  useEffect(() => {
    if (state.success) {
      trackEvent("contact_form_submit", { interest: interest || "unknown" });
    }
  }, [state.success, interest]);

  if (state.success) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-accent/15 ring-1 ring-brand-accent/30">
          <CheckCircle2 className="h-8 w-8 text-brand-accent-dark" />
        </div>
        <h3 className="font-display text-xl font-semibold text-brand-primary dark:text-white">
          Message sent
        </h3>
        <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
          {state.success}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            placeholder="John Smith"
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="john@company.com"
            required
            className="h-11"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            name="company"
            placeholder="Your organization"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="interest">I&apos;m interested in</Label>
          <input type="hidden" name="interest" value={interest} required />
          <Select value={interest} onValueChange={setInterest} required>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="demo">Book a demo</SelectItem>
              <SelectItem value="pricing">Pricing information</SelectItem>
              <SelectItem value="partnership">Partnership</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Tell us about your project, portfolio size, and monitoring needs..."
          rows={5}
          required
          className="resize-none"
        />
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full shadow-soft"
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {pending ? "Sending…" : "Send message"}
      </Button>
      <p className="text-center text-xs text-slate-500">
        By submitting, you agree to our{" "}
        <a href="/privacy" className="underline hover:text-brand-accent-dark">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
