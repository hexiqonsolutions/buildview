"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import { submitContact, type ContactActionState } from "@/lib/actions/contact";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import { CONTACT_INTERESTS } from "@/lib/validations/contact";
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

const interestOptions: { value: (typeof CONTACT_INTERESTS)[number]; label: string }[] = [
  { value: "construction", label: "Construction Intelligence" },
  { value: "interior", label: "Interior Showcase" },
  { value: "real-estate", label: "Real Estate Showcase" },
  { value: "demo", label: "Request a Live Demo" },
  { value: "quote", label: "Construction Monitoring Quote" },
  { value: "enterprise", label: "Enterprise Deployment" },
  { value: "matterport", label: "Virtual Tour Services" },
  { value: "partnership", label: "Partner With Us" },
  { value: "support", label: "Technical Support" },
  { value: "other", label: "Other" },
];

function isInterest(value: string | null): value is (typeof CONTACT_INTERESTS)[number] {
  return Boolean(value && (CONTACT_INTERESTS as readonly string[]).includes(value));
}

export function ContactForm({
  defaultInterest,
}: {
  defaultInterest?: string;
} = {}) {
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("interest");
  const initialInterest = isInterest(defaultInterest ?? null)
    ? defaultInterest!
    : isInterest(fromQuery)
      ? fromQuery
      : "";

  const [state, formAction, pending] = useActionState(submitContact, initialState);
  const [interest, setInterest] = useState(initialInterest);

  useEffect(() => {
    if (isInterest(fromQuery)) setInterest(fromQuery);
  }, [fromQuery]);

  useEffect(() => {
    if (state.success) {
      trackEvent(analyticsEvents.contact, { interest: interest || "unknown" });
      trackEvent(analyticsEvents.lead, { interest: interest || "unknown" });
      if (interest === "demo" || interest === "construction" || interest === "interior" || interest === "real-estate") {
        trackEvent(analyticsEvents.bookDemo, { interest });
      }
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
          <Input id="name" name="name" placeholder="John Smith" required className="h-11" />
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
          <Label htmlFor="company">Company name</Label>
          <Input id="company" name="company" placeholder="Your organization" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+91 98765 43210"
            className="h-11"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="interest">Service interested in</Label>
          <input type="hidden" name="interest" value={interest} required />
          <Select value={interest} onValueChange={setInterest} required>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {interestOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectType">Project type</Label>
          <Input
            id="projectType"
            name="projectType"
            placeholder="e.g. Residential tower, villa, office interior"
            className="h-11"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="projectLocation">Project location</Label>
        <Input
          id="projectLocation"
          name="projectLocation"
          placeholder="City / region"
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Tell us about your project and what you'd like to achieve..."
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
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {pending ? "Sending…" : "Send Inquiry"}
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
