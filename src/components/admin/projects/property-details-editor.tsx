"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ProjectMediaManager } from "@/components/admin/projects/project-media-manager";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { PropertyPage } from "@/components/property/property-page";
import {
  previewBuyerProperty,
  savePropertyDetails,
  type PropertyEditorData,
} from "@/lib/actions/property-details";
import {
  COMMON_AMENITIES,
  PRICE_MODE_LABELS,
  PROPERTY_SECTION_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  formatArea,
  formatInrCompact,
  sectionHiddenKey,
  type PropertySection,
} from "@/lib/property/fields";
import type { BuyerProperty } from "@/lib/property/buyer-view";
import type { ProjectMediaGroups } from "@/lib/project-media";
import { buildStoragePath, uploadFileToStorage } from "@/lib/supabase/storage";
import { STORAGE_BUCKETS } from "@/lib/types";
import type { SavePropertyDetailsInput } from "@/lib/validations/property";
import { getErrorMessage } from "@/lib/errors/public";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Form state (strings for inputs; converted to typed payload on save/preview)
// -----------------------------------------------------------------------------

type Row<T> = T & { key: string };
type UnitForm = Row<{
  id: string | null;
  configuration: string;
  carpet: string;
  builtUp: string;
  price: string;
  available: string;
  floorPlanPath: string | null;
  floorPlanUrl: string | null;
}>;

type FormState = {
  property_type: string;
  property_status: string;
  possession_date: string;
  rera_number: string;
  towers: string;
  floors: string;
  total_units: string;
  description: string;
  price_mode: string;
  price_min: string;
  price_max: string;
  price_per_sqft: string;
  latitude: string;
  longitude: string;
  nearby: Row<{ name: string; type: string; distance: string }>[];
  amenities: string[];
  specs: Row<{ label: string; value: string }>[];
  video_url: string;
  brochure_path: string | null;
  brochure_file_name: string | null;
  brochureUrl: string | null;
  enquiry_phone: string;
  whatsapp_number: string;
  enquiry_email: string;
  hidden: string[];
  units: UnitForm[];
};

let keySeed = 0;
const newKey = () => `k${Date.now().toString(36)}${(keySeed++).toString(36)}`;
const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
const nullIfBlank = (v: string) => (v.trim() === "" ? null : v.trim());
const numOrNull = (v: string) => {
  const t = v.trim().replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : (t as unknown as number); // let the server report the bad value
};

function toForm(data: PropertyEditorData): FormState {
  const d = data.details;
  return {
    property_type: str(d?.property_type),
    property_status: str(d?.property_status),
    possession_date: str(d?.possession_date),
    rera_number: str(d?.rera_number),
    towers: str(d?.towers),
    floors: str(d?.floors),
    total_units: str(d?.total_units),
    description: str(d?.description),
    price_mode: str(d?.price_mode),
    price_min: str(d?.price_min),
    price_max: str(d?.price_max),
    price_per_sqft: str(d?.price_per_sqft),
    latitude: str(d?.latitude),
    longitude: str(d?.longitude),
    nearby: (d?.nearby_places ?? []).map((p) => ({
      key: newKey(),
      name: str(p?.name),
      type: str(p?.type),
      distance: str(p?.distance),
    })),
    amenities: [...(d?.amenities ?? [])],
    specs: (d?.specifications ?? []).map((s) => ({ key: newKey(), label: str(s?.label), value: str(s?.value) })),
    video_url: str(d?.video_url),
    brochure_path: d?.brochure_path ?? null,
    brochure_file_name: d?.brochure_file_name ?? null,
    brochureUrl: data.brochureUrl,
    enquiry_phone: str(d?.enquiry_phone),
    whatsapp_number: str(d?.whatsapp_number),
    enquiry_email: str(d?.enquiry_email),
    hidden: [...(d?.hidden_fields ?? [])],
    units: data.units.map((u) => ({
      key: newKey(),
      id: u.id,
      configuration: str(u.configuration),
      carpet: str(u.carpet_area_sqft),
      builtUp: str(u.built_up_area_sqft),
      price: str(u.price),
      available: str(u.units_available),
      floorPlanPath: u.floor_plan_path,
      floorPlanUrl: u.floorPlanUrl,
    })),
  };
}

function toPayload(projectId: string, f: FormState): SavePropertyDetailsInput {
  const nearby = f.nearby
    .filter((p) => p.name.trim() || p.type.trim() || p.distance.trim())
    .map((p) => ({ name: p.name, type: nullIfBlank(p.type), distance: nullIfBlank(p.distance) }));
  const specs = f.specs
    .filter((s) => s.label.trim() || s.value.trim())
    .map((s) => ({ label: s.label, value: s.value }));
  const amenities = f.amenities.map((a) => a.trim()).filter(Boolean);
  return {
    project_id: projectId,
    details: {
      property_type: (nullIfBlank(f.property_type) as never) ?? null,
      property_status: (nullIfBlank(f.property_status) as never) ?? null,
      possession_date: nullIfBlank(f.possession_date),
      rera_number: nullIfBlank(f.rera_number),
      towers: numOrNull(f.towers),
      floors: numOrNull(f.floors),
      total_units: numOrNull(f.total_units),
      description: nullIfBlank(f.description),
      price_min: numOrNull(f.price_min),
      price_max: numOrNull(f.price_max),
      price_per_sqft: numOrNull(f.price_per_sqft),
      price_mode: (nullIfBlank(f.price_mode) as never) ?? null,
      latitude: numOrNull(f.latitude),
      longitude: numOrNull(f.longitude),
      nearby_places: nearby.length ? nearby : null,
      amenities: amenities.length ? amenities : null,
      specifications: specs.length ? specs : null,
      video_url: nullIfBlank(f.video_url),
      brochure_path: f.brochure_path,
      brochure_file_name: f.brochure_file_name,
      enquiry_phone: nullIfBlank(f.enquiry_phone),
      whatsapp_number: nullIfBlank(f.whatsapp_number),
      enquiry_email: nullIfBlank(f.enquiry_email),
      hidden_fields: f.hidden.length ? [...f.hidden].sort() : null,
    },
    units: f.units
      .filter(
        (u) =>
          u.id ||
          u.configuration.trim() ||
          u.carpet.trim() ||
          u.builtUp.trim() ||
          u.price.trim() ||
          u.available.trim() ||
          u.floorPlanPath
      )
      .map((u) => ({
        id: u.id,
        configuration: nullIfBlank(u.configuration),
        carpet_area_sqft: numOrNull(u.carpet),
        built_up_area_sqft: numOrNull(u.builtUp),
        price: numOrNull(u.price),
        units_available: numOrNull(u.available),
        floor_plan_path: u.floorPlanPath,
      })),
  };
}

// -----------------------------------------------------------------------------
// Small building blocks
// -----------------------------------------------------------------------------

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring";

function EyeToggle({
  hidden,
  onToggle,
  label,
}: {
  hidden: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={hidden}
      aria-label={hidden ? `Show ${label} to buyers` : `Hide ${label} from buyers`}
      title={hidden ? "Hidden from buyers — click to show" : "Visible to buyers — click to hide"}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
        hidden
          ? "bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/40"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
      )}
    >
      {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

function EditorSection({
  section,
  description,
  hidden,
  onToggle,
  actions,
  children,
}: {
  section: PropertySection;
  description?: string;
  hidden: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const title = PROPERTY_SECTION_LABELS[section];
  return (
    <section className={cn("ops-card space-y-5 p-5 sm:p-6", hidden && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <EyeToggle hidden={hidden} onToggle={onToggle} label={`the ${title} section`} />
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              {title}
              {hidden ? <span className="ml-2 text-xs font-normal text-amber-600">Hidden from buyers</span> : null}
            </h3>
            {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  hidden,
  onToggle,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string | null;
  hidden?: boolean;
  onToggle?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex min-h-7 items-center justify-between gap-2">
        <label htmlFor={htmlFor} className={cn("text-sm font-medium text-slate-700 dark:text-slate-300", hidden && "line-through opacity-60")}>
          {label}
        </label>
        {onToggle ? <EyeToggle hidden={Boolean(hidden)} onToggle={onToggle} label={label} /> : null}
      </div>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function RowButtons({
  index,
  count,
  onMove,
  onRemove,
  label,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move ${label} up`}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={`Move ${label} down`}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={onRemove} aria-label={`Remove ${label}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function uploadProjectFile(projectId: string, file: File, kind: "floor_plan" | "brochure") {
  const mime = (file.type || "").toLowerCase().replace("image/jpg", "image/jpeg");
  if (kind === "floor_plan" && !IMAGE_TYPES.includes(mime)) {
    throw new Error("Floor plans must be JPEG, PNG or WebP images.");
  }
  if (kind === "floor_plan" && file.size > 20 * 1024 * 1024) {
    throw new Error("Floor plans must be 20 MB or smaller.");
  }
  if (kind === "brochure" && mime !== "application/pdf") {
    throw new Error("The brochure must be a PDF.");
  }
  if (kind === "brochure" && file.size > 50 * 1024 * 1024) {
    throw new Error("The brochure must be 50 MB or smaller.");
  }
  return uploadFileToStorage(STORAGE_BUCKETS.PROJECT_MEDIA, buildStoragePath(projectId, file.name), file, {
    contentType: mime,
    timeoutMs: 120_000,
  });
}

// -----------------------------------------------------------------------------
// Editor
// -----------------------------------------------------------------------------

export function PropertyDetailsEditor({
  projectId,
  initial,
  media,
  tourUrl,
  tourName,
}: {
  projectId: string;
  initial: PropertyEditorData;
  media: ProjectMediaGroups;
  /** Latest walkthrough, used by "Preview as buyer". */
  tourUrl?: string | null;
  tourName?: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const baseline = useMemo(() => JSON.stringify(toPayload(projectId, toForm(initial))), [initial, projectId]);
  const dirty = JSON.stringify(toPayload(projectId, form)) !== baseline;

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, startSave] = useTransition();
  const [previewing, startPreview] = useTransition();
  const [preview, setPreview] = useState<BuyerProperty | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [amenityDraft, setAmenityDraft] = useState("");
  const brochureInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };
  const hiddenSetLocal = new Set(form.hidden);
  const isHidden = (key: string) => hiddenSetLocal.has(key);
  const toggle = (key: string) =>
    set("hidden", isHidden(key) ? form.hidden.filter((k) => k !== key) : [...form.hidden, key]);
  const sectionHidden = (s: PropertySection) => isHidden(sectionHiddenKey(s));
  const toggleSection = (s: PropertySection) => toggle(sectionHiddenKey(s));

  const updateUnit = (key: string, patch: Partial<UnitForm>) =>
    set(
      "units",
      form.units.map((u) => (u.key === key ? { ...u, ...patch } : u))
    );

  function save() {
    setError(null);
    startSave(async () => {
      try {
        await savePropertyDetails(toPayload(projectId, form));
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(getErrorMessage(err, "Could not save property details."));
      }
    });
  }

  function openPreview() {
    setError(null);
    startPreview(async () => {
      try {
        setPreview(await previewBuyerProperty(toPayload(projectId, form)));
      } catch (err) {
        setError(getErrorMessage(err, "Could not build the preview."));
      }
    });
  }

  async function handleFloorPlan(unitKey: string, file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(unitKey);
    try {
      const result = await uploadProjectFile(projectId, file, "floor_plan");
      updateUnit(unitKey, { floorPlanPath: result.path, floorPlanUrl: URL.createObjectURL(file) });
    } catch (err) {
      setError(getErrorMessage(err, "Floor plan upload failed."));
    } finally {
      setUploading(null);
    }
  }

  async function handleBrochure(file: File | undefined) {
    if (brochureInput.current) brochureInput.current.value = "";
    if (!file) return;
    setError(null);
    setUploading("brochure");
    try {
      const result = await uploadProjectFile(projectId, file, "brochure");
      setForm((current) => ({
        ...current,
        brochure_path: result.path,
        brochure_file_name: result.fileName,
        brochureUrl: URL.createObjectURL(file),
      }));
    } catch (err) {
      setError(getErrorMessage(err, "Brochure upload failed."));
    } finally {
      setUploading(null);
    }
  }

  function addAmenity(name: string) {
    const value = name.trim();
    if (!value) return;
    if (!form.amenities.some((a) => a.toLowerCase() === value.toLowerCase())) {
      set("amenities", [...form.amenities, value]);
    }
    setAmenityDraft("");
  }

  const priceHint = (value: string) => {
    const n = Number(value.replace(/,/g, ""));
    return value.trim() && Number.isFinite(n) ? formatInrCompact(n) : null;
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="ops-card sticky top-2 z-20 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Property details</h2>
          <p className="text-sm text-slate-500">
            Every field is optional. Empty or <EyeOff className="inline h-3.5 w-3.5 align-[-2px]" /> hidden fields never show to buyers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? <span className="text-xs font-medium text-amber-600">Unsaved changes</span> : null}
          {saved && !dirty ? <span className="text-xs font-medium text-emerald-600">Saved</span> : null}
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={openPreview} disabled={previewing || Boolean(uploading)}>
            {previewing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Eye className="mr-1.5 h-4 w-4" />}
            Preview as buyer
          </Button>
          <Button type="button" size="sm" className="ops-btn-primary h-9" onClick={save} disabled={saving || !dirty || Boolean(uploading)}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40">
          {error}
        </p>
      ) : null}

      {/* Overview */}
      <EditorSection section="overview" hidden={sectionHidden("overview")} onToggle={() => toggleSection("overview")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Property type" htmlFor="pd-type" hidden={isHidden("property_type")} onToggle={() => toggle("property_type")}>
            <select id="pd-type" className={selectClass} value={form.property_type} onChange={(e) => set("property_type", e.target.value)}>
              <option value="">Not set</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor="pd-status" hidden={isHidden("property_status")} onToggle={() => toggle("property_status")}>
            <select id="pd-status" className={selectClass} value={form.property_status} onChange={(e) => set("property_status", e.target.value)}>
              <option value="">Not set</option>
              {Object.entries(PROPERTY_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Possession date" htmlFor="pd-possession" hidden={isHidden("possession_date")} onToggle={() => toggle("possession_date")}>
            <Input id="pd-possession" type="date" value={form.possession_date} onChange={(e) => set("possession_date", e.target.value)} />
          </Field>
          <Field label="RERA number" htmlFor="pd-rera" hidden={isHidden("rera_number")} onToggle={() => toggle("rera_number")}>
            <Input id="pd-rera" value={form.rera_number} maxLength={80} onChange={(e) => set("rera_number", e.target.value)} />
          </Field>
          <Field label="Towers" htmlFor="pd-towers" hidden={isHidden("towers")} onToggle={() => toggle("towers")}>
            <Input id="pd-towers" type="number" min={0} inputMode="numeric" value={form.towers} onChange={(e) => set("towers", e.target.value)} />
          </Field>
          <Field label="Floors" htmlFor="pd-floors" hidden={isHidden("floors")} onToggle={() => toggle("floors")}>
            <Input id="pd-floors" type="number" min={0} inputMode="numeric" value={form.floors} onChange={(e) => set("floors", e.target.value)} />
          </Field>
          <Field label="Total units" htmlFor="pd-units" hidden={isHidden("total_units")} onToggle={() => toggle("total_units")}>
            <Input id="pd-units" type="number" min={0} inputMode="numeric" value={form.total_units} onChange={(e) => set("total_units", e.target.value)} />
          </Field>
        </div>
        <Field label="Description" htmlFor="pd-description" hidden={isHidden("description")} onToggle={() => toggle("description")}>
          <Textarea id="pd-description" rows={5} maxLength={5000} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </EditorSection>

      {/* Pricing */}
      <EditorSection section="pricing" description="Enter full rupee amounts, e.g. 8500000 for ₹85 L." hidden={sectionHidden("pricing")} onToggle={() => toggleSection("pricing")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Price display" htmlFor="pd-price-mode">
            <select id="pd-price-mode" className={selectClass} value={form.price_mode} onChange={(e) => set("price_mode", e.target.value)}>
              <option value="">Show prices (default)</option>
              {Object.entries(PRICE_MODE_LABELS)
                .filter(([value]) => value !== "show")
                .map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
            </select>
          </Field>
          <Field label="Minimum price (₹)" htmlFor="pd-price-min" hint={priceHint(form.price_min)} hidden={isHidden("price_min")} onToggle={() => toggle("price_min")}>
            <Input id="pd-price-min" type="number" min={0} inputMode="decimal" value={form.price_min} onChange={(e) => set("price_min", e.target.value)} />
          </Field>
          <Field label="Maximum price (₹)" htmlFor="pd-price-max" hint={priceHint(form.price_max)} hidden={isHidden("price_max")} onToggle={() => toggle("price_max")}>
            <Input id="pd-price-max" type="number" min={0} inputMode="decimal" value={form.price_max} onChange={(e) => set("price_max", e.target.value)} />
          </Field>
          <Field label="Price per sq ft (₹)" htmlFor="pd-price-sqft" hint={priceHint(form.price_per_sqft)} hidden={isHidden("price_per_sqft")} onToggle={() => toggle("price_per_sqft")}>
            <Input id="pd-price-sqft" type="number" min={0} inputMode="decimal" value={form.price_per_sqft} onChange={(e) => set("price_per_sqft", e.target.value)} />
          </Field>
        </div>
      </EditorSection>

      {/* Unit types */}
      <EditorSection
        section="units"
        description="Toggle the eye on a column to hide it for every unit type."
        hidden={sectionHidden("units")}
        onToggle={() => toggleSection("units")}
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() =>
              set("units", [
                ...form.units,
                { key: newKey(), id: null, configuration: "", carpet: "", builtUp: "", price: "", available: "", floorPlanPath: null, floorPlanUrl: null },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add unit type
          </Button>
        }
      >
        {form.units.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {(
                [
                  ["unit_carpet_area", "Carpet area"],
                  ["unit_built_up_area", "Built-up area"],
                  ["unit_price", "Price"],
                  ["unit_availability", "Availability"],
                  ["unit_floor_plan", "Floor plan"],
                ] as const
              ).map(([key, label]) => (
                <span key={key} className="inline-flex items-center gap-1">
                  <EyeToggle hidden={isHidden(key)} onToggle={() => toggle(key)} label={`${label} column`} />
                  <span className={cn(isHidden(key) && "line-through")}>{label}</span>
                </span>
              ))}
            </div>
            <div className="space-y-3">
              {form.units.map((unit, index) => (
                <div key={unit.key} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-5">
                      <Field label="Configuration" htmlFor={`u-conf-${unit.key}`}>
                        <Input id={`u-conf-${unit.key}`} placeholder="2 BHK" maxLength={60} value={unit.configuration} onChange={(e) => updateUnit(unit.key, { configuration: e.target.value })} />
                      </Field>
                      <Field label="Carpet (sq ft)" htmlFor={`u-carpet-${unit.key}`}>
                        <Input id={`u-carpet-${unit.key}`} type="number" min={0} value={unit.carpet} onChange={(e) => updateUnit(unit.key, { carpet: e.target.value })} />
                      </Field>
                      <Field label="Built-up (sq ft)" htmlFor={`u-built-${unit.key}`}>
                        <Input id={`u-built-${unit.key}`} type="number" min={0} value={unit.builtUp} onChange={(e) => updateUnit(unit.key, { builtUp: e.target.value })} />
                      </Field>
                      <Field label="Price (₹)" htmlFor={`u-price-${unit.key}`} hint={priceHint(unit.price)}>
                        <Input id={`u-price-${unit.key}`} type="number" min={0} value={unit.price} onChange={(e) => updateUnit(unit.key, { price: e.target.value })} />
                      </Field>
                      <Field label="Units available" htmlFor={`u-avail-${unit.key}`}>
                        <Input id={`u-avail-${unit.key}`} type="number" min={0} value={unit.available} onChange={(e) => updateUnit(unit.key, { available: e.target.value })} />
                      </Field>
                    </div>
                    <div className="flex items-center justify-between gap-2 lg:justify-end">
                      <FloorPlanPicker
                        unit={unit}
                        busy={uploading === unit.key}
                        onPick={(file) => void handleFloorPlan(unit.key, file)}
                        onClear={() => updateUnit(unit.key, { floorPlanPath: null, floorPlanUrl: null })}
                      />
                      <RowButtons
                        index={index}
                        count={form.units.length}
                        label={unit.configuration || "unit type"}
                        onMove={(from, to) => set("units", move(form.units, from, to))}
                        onRemove={() => set("units", form.units.filter((u) => u.key !== unit.key))}
                      />
                    </div>
                  </div>
                  {unit.carpet && unit.builtUp ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {formatArea(Number(unit.carpet))} carpet · {formatArea(Number(unit.builtUp))} built-up
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800">
            No unit types yet.
          </p>
        )}
      </EditorSection>

      {/* Amenities */}
      <EditorSection section="amenities" hidden={sectionHidden("amenities")} onToggle={() => toggleSection("amenities")}>
        {form.amenities.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {form.amenities.map((amenity) => (
              <li key={amenity} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 text-sm dark:border-slate-700 dark:bg-slate-800">
                {amenity}
                <button
                  type="button"
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                  onClick={() => set("amenities", form.amenities.filter((a) => a !== amenity))}
                  aria-label={`Remove ${amenity}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addAmenity(amenityDraft);
          }}
        >
          <Input placeholder="Add an amenity" maxLength={80} value={amenityDraft} onChange={(e) => setAmenityDraft(e.target.value)} aria-label="New amenity" />
          <Button type="submit" variant="outline" disabled={!amenityDraft.trim()}>
            Add
          </Button>
        </form>
        {COMMON_AMENITIES.some((a) => !form.amenities.includes(a)) ? (
          <div className="flex flex-wrap gap-1.5">
            {COMMON_AMENITIES.filter((a) => !form.amenities.includes(a)).map((amenity) => (
              <button
                key={amenity}
                type="button"
                onClick={() => addAmenity(amenity)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <Plus className="h-3 w-3" /> {amenity}
              </button>
            ))}
          </div>
        ) : null}
      </EditorSection>

      {/* Specifications */}
      <EditorSection
        section="specifications"
        hidden={sectionHidden("specifications")}
        onToggle={() => toggleSection("specifications")}
        actions={
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => set("specs", [...form.specs, { key: newKey(), label: "", value: "" }])}>
            <Plus className="mr-1 h-4 w-4" /> Add specification
          </Button>
        }
      >
        {form.specs.length > 0 ? (
          <div className="space-y-2">
            {form.specs.map((spec, index) => (
              <div key={spec.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  className="sm:w-56"
                  placeholder="e.g. Flooring"
                  maxLength={120}
                  value={spec.label}
                  aria-label="Specification name"
                  onChange={(e) => set("specs", form.specs.map((s) => (s.key === spec.key ? { ...s, label: e.target.value } : s)))}
                />
                <Input
                  className="flex-1"
                  placeholder="e.g. 800×800 vitrified tiles in living and bedrooms"
                  maxLength={500}
                  value={spec.value}
                  aria-label="Specification detail"
                  onChange={(e) => set("specs", form.specs.map((s) => (s.key === spec.key ? { ...s, value: e.target.value } : s)))}
                />
                <RowButtons
                  index={index}
                  count={form.specs.length}
                  label={spec.label || "specification"}
                  onMove={(from, to) => set("specs", move(form.specs, from, to))}
                  onRemove={() => set("specs", form.specs.filter((s) => s.key !== spec.key))}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800">
            No specifications yet.
          </p>
        )}
      </EditorSection>

      {/* Location */}
      <EditorSection section="location" hidden={sectionHidden("location")} onToggle={() => toggleSection("location")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Map pin — latitude" htmlFor="pd-lat" hint="Right-click the spot in Google Maps to copy coordinates." hidden={isHidden("map")} onToggle={() => toggle("map")}>
            <Input
              id="pd-lat"
              inputMode="decimal"
              placeholder="19.0760"
              value={form.latitude}
              onChange={(e) => {
                const raw = e.target.value;
                // Pasting "19.07, 72.87" fills both fields.
                const pair = raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
                if (pair) {
                  setForm((c) => ({ ...c, latitude: pair[1], longitude: pair[2] }));
                } else {
                  set("latitude", raw);
                }
              }}
            />
          </Field>
          <Field label="Map pin — longitude" htmlFor="pd-lng">
            <Input id="pd-lng" inputMode="decimal" placeholder="72.8777" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
          </Field>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <EyeToggle hidden={isHidden("nearby_places")} onToggle={() => toggle("nearby_places")} label="nearby places" />
              <span className={cn("text-sm font-medium text-slate-700 dark:text-slate-300", isHidden("nearby_places") && "line-through opacity-60")}>Nearby places</span>
            </div>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => set("nearby", [...form.nearby, { key: newKey(), name: "", type: "", distance: "" }])}>
              <Plus className="mr-1 h-4 w-4" /> Add place
            </Button>
          </div>
          {form.nearby.map((place, index) => (
            <div key={place.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input className="flex-1" placeholder="e.g. Phoenix Mall" maxLength={120} value={place.name} aria-label="Place name"
                onChange={(e) => set("nearby", form.nearby.map((p) => (p.key === place.key ? { ...p, name: e.target.value } : p)))} />
              <Input className="sm:w-40" placeholder="Type, e.g. Mall" maxLength={60} value={place.type} aria-label="Place type"
                onChange={(e) => set("nearby", form.nearby.map((p) => (p.key === place.key ? { ...p, type: e.target.value } : p)))} />
              <Input className="sm:w-32" placeholder="e.g. 2.5 km" maxLength={40} value={place.distance} aria-label="Distance"
                onChange={(e) => set("nearby", form.nearby.map((p) => (p.key === place.key ? { ...p, distance: e.target.value } : p)))} />
              <RowButtons
                index={index}
                count={form.nearby.length}
                label={place.name || "place"}
                onMove={(from, to) => set("nearby", move(form.nearby, from, to))}
                onRemove={() => set("nearby", form.nearby.filter((p) => p.key !== place.key))}
              />
            </div>
          ))}
        </div>
      </EditorSection>

      {/* Media */}
      <EditorSection section="media" description="Photos and videos save as soon as they upload." hidden={sectionHidden("media")} onToggle={() => toggleSection("media")}>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {(
            [
              ["gallery", "Photo gallery"],
              ["videos", "Uploaded videos"],
            ] as const
          ).map(([key, label]) => (
            <span key={key} className="inline-flex items-center gap-1">
              <EyeToggle hidden={isHidden(key)} onToggle={() => toggle(key)} label={label} />
              <span className={cn("text-slate-700 dark:text-slate-300", isHidden(key) && "line-through opacity-60")}>{label}</span>
            </span>
          ))}
        </div>
        <ProjectMediaManager projectId={projectId} initialMedia={media} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Video link (YouTube or Vimeo)" htmlFor="pd-video" hidden={isHidden("video_url")} onToggle={() => toggle("video_url")}>
            <Input id="pd-video" type="url" placeholder="https://www.youtube.com/watch?v=…" value={form.video_url} onChange={(e) => set("video_url", e.target.value)} />
          </Field>
          <Field label="Brochure (PDF)" hidden={isHidden("brochure")} onToggle={() => toggle("brochure")}>
            <input ref={brochureInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => void handleBrochure(e.target.files?.[0])} />
            {form.brochure_path ? (
              <div className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                {form.brochureUrl ? (
                  <a href={form.brochureUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                    {form.brochure_file_name ?? "Brochure.pdf"}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 truncate">{form.brochure_file_name ?? "Brochure.pdf"}</span>
                )}
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:text-red-600"
                  onClick={() => setForm((c) => ({ ...c, brochure_path: null, brochure_file_name: null, brochureUrl: null }))}
                  aria-label="Remove brochure"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" disabled={uploading === "brochure"} onClick={() => brochureInput.current?.click()}>
                {uploading === "brochure" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                Upload brochure
              </Button>
            )}
          </Field>
        </div>
      </EditorSection>

      {/* Construction progress */}
      <EditorSection
        section="progress"
        description="Shown to buyers only while the property isn't completed. Uses status, possession date and the latest timeline updates."
        hidden={sectionHidden("progress")}
        onToggle={() => toggleSection("progress")}
      >
        <span className="inline-flex items-center gap-1 text-sm">
          <EyeToggle hidden={isHidden("progress_updates")} onToggle={() => toggle("progress_updates")} label="timeline updates" />
          <span className={cn("text-slate-700 dark:text-slate-300", isHidden("progress_updates") && "line-through opacity-60")}>
            Latest timeline updates and progress %
          </span>
        </span>
      </EditorSection>

      {/* Enquiry contacts */}
      <EditorSection
        section="enquiry"
        description="Where buyer enquiries go. WhatsApp falls back to BuildView sales when empty."
        hidden={sectionHidden("enquiry")}
        onToggle={() => toggleSection("enquiry")}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Phone" htmlFor="pd-phone" hidden={isHidden("enquiry_phone")} onToggle={() => toggle("enquiry_phone")}>
            <Input id="pd-phone" type="tel" placeholder="+91 98765 43210" value={form.enquiry_phone} onChange={(e) => set("enquiry_phone", e.target.value)} />
          </Field>
          <Field label="WhatsApp" htmlFor="pd-wa" hidden={isHidden("whatsapp_number")} onToggle={() => toggle("whatsapp_number")}>
            <Input id="pd-wa" type="tel" placeholder="+91 98765 43210" value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="pd-email" hidden={isHidden("enquiry_email")} onToggle={() => toggle("enquiry_email")}>
            <Input id="pd-email" type="email" placeholder="sales@developer.com" value={form.enquiry_email} onChange={(e) => set("enquiry_email", e.target.value)} />
          </Field>
        </div>
      </EditorSection>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[92dvh] max-w-6xl overflow-y-auto bg-slate-50 p-4 sm:p-8 dark:bg-slate-950">
          <DialogTitle className="text-sm font-semibold text-slate-500">Buyer preview</DialogTitle>
          <DialogDescription className="-mt-2 text-xs">
            Unsaved changes included. Hidden and empty fields are left out exactly as buyers see it.
          </DialogDescription>
          {preview ? (
            <PropertyPage
              view={preview}
              tour={
                tourUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <MatterportViewer url={tourUrl} title={tourName ?? "360° Virtual Tour"} aspectRatio showToolbar className="rounded-none" />
                  </div>
                ) : undefined
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FloorPlanPicker({
  unit,
  busy,
  onPick,
  onClear,
}: {
  unit: UnitForm;
  busy: boolean;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {unit.floorPlanPath ? (
        <div className="relative h-10 w-14 overflow-hidden rounded border border-slate-200 bg-slate-50 dark:border-slate-700">
          {unit.floorPlanUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={unit.floorPlanUrl} alt="Floor plan" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="m-auto h-4 w-4 text-slate-400" />
          )}
          <button
            type="button"
            onClick={onClear}
            className="absolute right-0 top-0 rounded-bl bg-white/90 p-0.5 text-slate-500 hover:text-red-600"
            aria-label="Remove floor plan"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}
      <Button type="button" size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
        {unit.floorPlanPath ? "Replace" : "Floor plan"}
      </Button>
    </div>
  );
}
