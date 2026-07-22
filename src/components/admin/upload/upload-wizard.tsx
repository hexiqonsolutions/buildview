"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Camera,
  FileText,
  FolderOpen,
  ImageIcon,
  Calendar,
  Receipt,
  Loader2,
  CheckCircle2,
  Upload,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import {
  attachSitePhotosWithAutomation,
  uploadDocumentWithAutomation,
  uploadIssueWithAutomation,
  uploadMatterportWithAutomation,
  uploadReportWithAutomation,
  uploadTimelineUpdateWithAutomation,
  type UploadCategory,
  type UploadResult,
} from "@/lib/actions/upload-orchestrator";
import { addIssueImages } from "@/lib/actions/issues";
import {
  categoryIsIssue,
  categoryIsTimelineOnly,
  categoryNeedsFile,
  categoryNeedsMatterportUrl,
  DOC_CATEGORY_MAP,
  getAutomationPreview,
  REPORT_TYPE_CATEGORIES,
  resolveUploadCategoryFromParam,
  WIZARD_STEPS,
  type UploadWizardStep,
} from "@/lib/admin/upload-type-config";
import {
  uploadDocumentFile,
  uploadIssueImageFile,
  uploadReportFile,
  uploadTimelinePhotoFile,
} from "@/lib/supabase/storage";
import { isValidMatterportUrl } from "@/lib/matterport";
import { validateDocumentFile } from "@/lib/validations/document";
import { validateIssueImageFiles } from "@/lib/validations/issue";
import { validateReportFile } from "@/lib/validations/report";
import { ISSUE_PRIORITY_LABELS, type DocumentCategory, type IssuePriority, type ReportType } from "@/lib/types";
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
import { cn } from "@/lib/utils";

const CATEGORIES: {
  id: UploadCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  { id: "matterport", label: "Matterport Tour", icon: Camera, description: "3D scan link" },
  { id: "progress_report", label: "Progress Report", icon: FileText, description: "PDF report" },
  { id: "inspection_report", label: "Inspection Report", icon: FileText, description: "PDF report" },
  { id: "safety_report", label: "Safety Report", icon: FileText, description: "PDF report" },
  { id: "drawings", label: "Drawings", icon: FolderOpen, description: "Plans & drawings" },
  { id: "boqs", label: "BOQ", icon: FolderOpen, description: "Bill of quantities" },
  { id: "contracts", label: "Contracts", icon: FolderOpen, description: "Contract docs" },
  { id: "invoices_doc", label: "Invoice Doc", icon: Receipt, description: "Invoice PDF" },
  { id: "site_photos", label: "Site Photos", icon: ImageIcon, description: "Photo upload" },
  { id: "timeline_update", label: "Timeline Update", icon: Calendar, description: "Milestone note" },
  { id: "issue", label: "Issue", icon: AlertTriangle, description: "Report a site issue" },
  { id: "other", label: "Other", icon: FolderOpen, description: "General document" },
];

export function UploadWizard() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");
  const {
    hydrated,
    client,
    project,
    clients,
    scope,
    clientProjects,
    buildings,
    floors,
    setClientId,
    setProjectId,
    setBuilding,
    setFloor,
  } = useAdminWorkspace();

  const [step, setStep] = useState<UploadWizardStep>(() =>
    client && project ? "category" : "workspace"
  );
  const [category, setCategory] = useState<UploadCategory>(() =>
    resolveUploadCategoryFromParam(initialType)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tourName, setTourName] = useState("");
  const [matterportUrl, setMatterportUrl] = useState("");
  const [captureDate, setCaptureDate] = useState("");
  const [engineer, setEngineer] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [issuePriority, setIssuePriority] = useState<IssuePriority>("medium");
  const [issueLocation, setIssueLocation] = useState("");

  const projectId = scope.projectId ?? "";
  const building = scope.building !== "all" ? scope.building : "";
  const floor = scope.floor !== "all" ? scope.floor : "";
  const automation = useMemo(() => getAutomationPreview(category), [category]);
  const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === step);

  const resetForm = useCallback(() => {
    setFiles([]);
    setTourName("");
    setMatterportUrl("");
    setCaptureDate("");
    setEngineer("");
    setProgressNote("");
    setTitle("");
    setIssuePriority("medium");
    setIssueLocation("");
    setError(null);
    setResult(null);
    setStep(client && project ? "category" : "workspace");
  }, [client, project]);

  function validateDetails(): string | null {
    if (!projectId) return "Choose a client and project before uploading.";
    if (categoryNeedsMatterportUrl(category)) {
      if (!tourName.trim()) return "Tour name is required.";
      if (!isValidMatterportUrl(matterportUrl)) return "Enter a valid Matterport URL.";
    }
    if (categoryIsTimelineOnly(category) && !title.trim()) {
      return "Milestone title is required.";
    }
    if (categoryIsIssue(category) && !title.trim()) {
      return "Issue title is required.";
    }
    if (categoryNeedsFile(category)) {
      if (files.length === 0) return "Select at least one file.";
      if (REPORT_TYPE_CATEGORIES.has(category)) {
        const err = validateReportFile(files[0]);
        if (err) return err;
      } else if (category in DOC_CATEGORY_MAP) {
        const err = validateDocumentFile(files[0]);
        if (err) return err;
      } else if (categoryIsIssue(category)) {
        const err = validateIssueImageFiles(files);
        if (err) return err;
      }
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fix site_photos: don't create N events in runUpload - simplify
      const uploadResult = await executeUpload();
      setResult(uploadResult);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }

    setLoading(false);
  }

  async function executeUpload(): Promise<UploadResult> {
    const scopeMeta = {
      building: building || undefined,
      floor: floor || undefined,
      engineer: engineer || undefined,
    };

    if (category === "matterport") {
      return uploadMatterportWithAutomation({
        project_id: projectId,
        name: tourName,
        matterport_url: matterportUrl,
        capture_date: captureDate || undefined,
        ...scopeMeta,
        progress_note: progressNote || undefined,
      });
    }

    if (category === "timeline_update") {
      return uploadTimelineUpdateWithAutomation({
        project_id: projectId,
        title,
        event_date: eventDate,
        progress_note: progressNote || undefined,
        ...scopeMeta,
      });
    }

    if (REPORT_TYPE_CATEGORIES.has(category)) {
      const file = files[0];
      const upload = await uploadReportFile(projectId, file);
      return uploadReportWithAutomation({
        project_id: projectId,
        title: title || file.name,
        report_type: category as ReportType,
        report_date: eventDate,
        storage_path: upload.path,
        file_name: upload.fileName,
        file_size: upload.fileSize,
        mime_type: upload.mimeType,
        description: progressNote || undefined,
        ...scopeMeta,
      });
    }

    if (category === "site_photos") {
      const photoTitle = title || `Site photos — ${eventDate}`;
      const { eventId } = await uploadTimelineUpdateWithAutomation({
        project_id: projectId,
        title: photoTitle,
        event_date: eventDate,
        progress_note:
          progressNote ||
          `${files.length} site photo${files.length === 1 ? "" : "s"} uploaded via Upload Center.`,
        ...scopeMeta,
      });

      const photos = await Promise.all(
        files.map(async (file) => {
          const upload = await uploadTimelinePhotoFile(projectId, eventId!, file);
          return {
            storage_path: upload.path,
            file_name: upload.fileName,
            caption: title || file.name,
          };
        })
      );

      return attachSitePhotosWithAutomation({
        project_id: projectId,
        event_id: eventId!,
        title: photoTitle,
        photos,
        building: scopeMeta.building,
        floor: scopeMeta.floor,
      });
    }

    if (categoryIsIssue(category)) {
      const upload = await uploadIssueWithAutomation({
        project_id: projectId,
        title,
        description: progressNote || undefined,
        priority: issuePriority,
        location: issueLocation || undefined,
        event_date: eventDate,
        ...scopeMeta,
      });

      if (files.length > 0 && upload.issueId) {
        const images = await Promise.all(
          files.map(async (file, index) => {
            const fileUpload = await uploadIssueImageFile(projectId, upload.issueId!, file);
            return {
              storage_path: fileUpload.path,
              file_name: fileUpload.fileName,
              sort_order: index,
            };
          })
        );
        await addIssueImages(upload.issueId, images);
      }

      return upload;
    }

    if (category in DOC_CATEGORY_MAP) {
      const file = files[0];
      const docCat = (DOC_CATEGORY_MAP[category] ?? "other") as DocumentCategory;
      const upload = await uploadDocumentFile(projectId, file);
      return uploadDocumentWithAutomation({
        project_id: projectId,
        name: title || file.name,
        category: docCat,
        storage_path: upload.path,
        file_name: upload.fileName,
        file_size: upload.fileSize,
        mime_type: upload.mimeType,
        description: progressNote || undefined,
        event_date: eventDate,
        ...scopeMeta,
      });
    }

    throw new Error("Unsupported upload category.");
  }

  function handleFilePick(selected: FileList | null) {
    if (!selected || selected.length === 0) {
      setFiles([]);
      return;
    }

    const next = category === "site_photos" || categoryIsIssue(category)
      ? [...files, ...Array.from(selected)]
      : [selected[0]];

    if (REPORT_TYPE_CATEGORIES.has(category)) {
      const err = validateReportFile(next[0]);
      if (err) {
        setError(err);
        return;
      }
    } else if (category in DOC_CATEGORY_MAP) {
      const err = validateDocumentFile(next[0]);
      if (err) {
        setError(err);
        return;
      }
    } else if (categoryIsIssue(category)) {
      const err = validateIssueImageFiles(next);
      if (err) {
        setError(err);
        return;
      }
    }

    setError(null);
    setFiles(next);
    if (!title && next[0]) setTitle(next[0].name.replace(/\.[^.]+$/, ""));
  }

  function goNext() {
    setError(null);
    if (step === "workspace") {
      if (!scope.clientId) {
        setError("Choose a client for this upload.");
        return;
      }
      if (!projectId) {
        setError("Choose a project for this upload.");
        return;
      }
      setStep("category");
      return;
    }
    if (step === "category") {
      setStep("details");
      return;
    }
    if (step === "details") {
      const validationError = validateDetails();
      if (validationError) {
        setError(validationError);
        return;
      }
      setStep("review");
    }
  }

  function goBack() {
    setError(null);
    if (step === "category") setStep("workspace");
    else if (step === "details") setStep("category");
    else if (step === "review") setStep("details");
  }

  if (!hydrated) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                i <= stepIndex
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-800"
              )}
            >
              {i < stepIndex || step === "success" ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                s.id === step ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500"
              )}
            >
              {s.label}
            </span>
            {i < WIZARD_STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-slate-300" />
            )}
          </div>
        ))}
      </nav>

      <div className="ops-card p-6">
        {step === "workspace" && (
          <WorkspaceStep
            clients={clients}
            client={client}
            project={project}
            clientProjects={clientProjects}
            buildings={buildings}
            floors={floors}
            scope={scope}
            setClientId={setClientId}
            setProjectId={setProjectId}
            setBuilding={setBuilding}
            setFloor={setFloor}
            error={error}
          />
        )}

        {step === "category" && (
          <CategoryStep category={category} onSelect={setCategory} />
        )}

        {step === "details" && (
          <DetailsStep
            category={category}
            tourName={tourName}
            setTourName={setTourName}
            matterportUrl={matterportUrl}
            setMatterportUrl={setMatterportUrl}
            captureDate={captureDate}
            setCaptureDate={setCaptureDate}
            engineer={engineer}
            setEngineer={setEngineer}
            progressNote={progressNote}
            setProgressNote={setProgressNote}
            title={title}
            setTitle={setTitle}
            eventDate={eventDate}
            setEventDate={setEventDate}
            issuePriority={issuePriority}
            setIssuePriority={setIssuePriority}
            issueLocation={issueLocation}
            setIssueLocation={setIssueLocation}
            files={files}
            dragOver={dragOver}
            setDragOver={setDragOver}
            fileRef={fileRef}
            onFilePick={handleFilePick}
            client={client}
            project={project}
            building={building}
            floor={floor}
          />
        )}

        {step === "review" && (
          <ReviewStep
            category={category}
            automation={automation}
            title={title || tourName}
            client={client}
            project={project}
            building={building}
            floor={floor}
            fileCount={files.length}
          />
        )}

        {step === "success" && (
          <SuccessStep
            result={result}
            projectId={projectId}
            category={category}
            onReset={resetForm}
          />
        )}

        {error && step !== "workspace" && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        )}

        {step !== "success" && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={step === "workspace" || loading}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            {step === "review" ? (
              <Button
                type="button"
                className="ops-btn-primary h-10 px-6"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload & Process
              </Button>
            ) : (
              <Button
                type="button"
                className="ops-btn-primary h-10 px-6"
                onClick={goNext}
                disabled={step === "workspace" && !projectId}
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceStep({
  clients,
  client,
  project,
  clientProjects,
  buildings,
  floors,
  scope,
  setClientId,
  setProjectId,
  setBuilding,
  setFloor,
  error,
}: {
  clients: ReturnType<typeof useAdminWorkspace>["clients"];
  client: ReturnType<typeof useAdminWorkspace>["client"];
  project: ReturnType<typeof useAdminWorkspace>["project"];
  clientProjects: ReturnType<typeof useAdminWorkspace>["clientProjects"];
  buildings: string[];
  floors: string[];
  scope: ReturnType<typeof useAdminWorkspace>["scope"];
  setClientId: (id: string | null) => void;
  setProjectId: (id: string | null) => void;
  setBuilding: (building: string) => void;
  setFloor: (floor: string) => void;
  error: string | null;
}) {
  if (clients.length === 0) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-amber-500" />
        <p className="font-medium text-slate-900 dark:text-white">No clients yet</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Create a client and project first, then come back to upload.
        </p>
        <Button asChild className="mt-4 ops-btn-primary h-9" size="sm">
          <Link href="/admin/clients">Go to Client Manager</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Where should this upload go?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Pick the client and project. Everything you upload will be saved there.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="upload-client">1. Client</Label>
          <Select
            value={scope.clientId ?? undefined}
            onValueChange={(v) => setClientId(v || null)}
          >
            <SelectTrigger id="upload-client" className="h-11">
              <SelectValue placeholder="Select a client organization" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.company_name || c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="upload-project">2. Project</Label>
          <Select
            value={scope.projectId ?? undefined}
            onValueChange={(v) => setProjectId(v || null)}
            disabled={!scope.clientId || clientProjects.length === 0}
          >
            <SelectTrigger id="upload-project" className="h-11">
              <SelectValue
                placeholder={
                  !scope.clientId
                    ? "Select a client first"
                    : clientProjects.length === 0
                      ? "No projects for this client"
                      : "Select a project"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {clientProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {scope.clientId && clientProjects.length === 0 && (
            <p className="text-xs text-slate-500">
              This client has no projects.{" "}
              <Link href="/admin/projects" className="font-medium underline underline-offset-2">
                Create a project
              </Link>
            </p>
          )}
        </div>

        {scope.projectId && (buildings.length > 0 || floors.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="upload-building">Building (optional)</Label>
              <Select value={scope.building} onValueChange={setBuilding}>
                <SelectTrigger id="upload-building" className="h-11">
                  <SelectValue placeholder="All buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All buildings</SelectItem>
                  {buildings.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-floor">Floor (optional)</Label>
              <Select
                value={scope.floor}
                onValueChange={setFloor}
                disabled={scope.building === "all" || floors.length === 0}
              >
                <SelectTrigger id="upload-floor" className="h-11">
                  <SelectValue placeholder="All floors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All floors</SelectItem>
                  {floors.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {client && project && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Ready to continue
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
            {client.company_name || client.name}
            <span className="mx-1.5 text-slate-400">→</span>
            {project.name}
            {scope.building !== "all" && (
              <span className="text-slate-500">
                {" "}
                · {scope.building}
                {scope.floor !== "all" ? ` · ${scope.floor}` : ""}
              </span>
            )}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

function CategoryStep({
  category,
  onSelect,
}: {
  category: UploadCategory;
  onSelect: (c: UploadCategory) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
            category === cat.id
              ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800/60"
              : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              category === cat.id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800"
            )}
          >
            <cat.icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{cat.label}</p>
            <p className="text-xs text-slate-500">{cat.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function DetailsStep(props: {
  category: UploadCategory;
  tourName: string;
  setTourName: (v: string) => void;
  matterportUrl: string;
  setMatterportUrl: (v: string) => void;
  captureDate: string;
  setCaptureDate: (v: string) => void;
  engineer: string;
  setEngineer: (v: string) => void;
  progressNote: string;
  setProgressNote: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  eventDate: string;
  setEventDate: (v: string) => void;
  issuePriority: IssuePriority;
  setIssuePriority: (v: IssuePriority) => void;
  issueLocation: string;
  setIssueLocation: (v: string) => void;
  files: File[];
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFilePick: (files: FileList | null) => void;
  client: ReturnType<typeof useAdminWorkspace>["client"];
  project: ReturnType<typeof useAdminWorkspace>["project"];
  building: string;
  floor: string;
}) {
  const {
    category,
    tourName,
    setTourName,
    matterportUrl,
    setMatterportUrl,
    captureDate,
    setCaptureDate,
    engineer,
    setEngineer,
    progressNote,
    setProgressNote,
    title,
    setTitle,
    eventDate,
    setEventDate,
    issuePriority,
    setIssuePriority,
    issueLocation,
    setIssueLocation,
    files,
    dragOver,
    setDragOver,
    fileRef,
    onFilePick,
    client,
    project,
    building,
    floor,
  } = props;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
        <p className="text-xs font-medium text-slate-500">Uploading to</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
          {client?.company_name || client?.name} → {project?.name}
          {building && ` → ${building}`}
          {floor && ` → ${floor}`}
        </p>
      </div>

      {category === "matterport" && (
        <>
          <Field label="Tour name" required>
            <Input value={tourName} onChange={(e) => setTourName(e.target.value)} required placeholder="Level 8 — June Capture" />
          </Field>
          <Field label="Matterport URL" required>
            <Input value={matterportUrl} onChange={(e) => setMatterportUrl(e.target.value)} required placeholder="https://my.matterport.com/show/?m=..." />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Capture date">
              <Input type="date" value={captureDate} onChange={(e) => setCaptureDate(e.target.value)} />
            </Field>
            <Field label="Engineer">
              <Input value={engineer} onChange={(e) => setEngineer(e.target.value)} placeholder="Site engineer" />
            </Field>
          </div>
          <Field label="Progress note">
            <Textarea value={progressNote} onChange={(e) => setProgressNote(e.target.value)} rows={2} />
          </Field>
        </>
      )}

      {category === "timeline_update" && (
        <>
          <Field label="Milestone title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field label="Event date" required>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
          </Field>
          <Field label="Engineer notes">
            <Textarea value={progressNote} onChange={(e) => setProgressNote(e.target.value)} rows={3} />
          </Field>
        </>
      )}

      {categoryIsIssue(category) && (
        <>
          <Field label="Issue title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Priority" required>
              <Select value={issuePriority} onValueChange={(v) => setIssuePriority(v as IssuePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ISSUE_PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Location">
              <Input value={issueLocation} onChange={(e) => setIssueLocation(e.target.value)} placeholder="Level 8 — East wing" />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={progressNote} onChange={(e) => setProgressNote(e.target.value)} rows={3} />
          </Field>
        </>
      )}

      {categoryNeedsFile(category) && (
        <>
          {!categoryIsIssue(category) && (
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
            </Field>
          )}
          {!categoryIsIssue(category) && (
            <Field label="Date">
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </Field>
          )}
          <FileDropZone
            category={category}
            files={files}
            dragOver={dragOver}
            setDragOver={setDragOver}
            fileRef={fileRef}
            onFilePick={onFilePick}
          />
          {!categoryIsIssue(category) && (
            <Field label="Notes">
              <Textarea value={progressNote} onChange={(e) => setProgressNote(e.target.value)} rows={2} />
            </Field>
          )}
        </>
      )}
    </div>
  );
}

function FileDropZone({
  category,
  files,
  dragOver,
  setDragOver,
  fileRef,
  onFilePick,
}: {
  category: UploadCategory;
  files: File[];
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFilePick: (files: FileList | null) => void;
}) {
  const multi = category === "site_photos" || categoryIsIssue(category);

  return (
    <div
      className={cn(
        "ops-upload-zone flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors",
        dragOver && "border-brand-accent bg-brand-accent/5"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onFilePick(e.dataTransfer.files);
      }}
      onClick={() => fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        multiple={multi}
        accept={REPORT_TYPE_CATEGORIES.has(category) ? "application/pdf" : undefined}
        onChange={(e) => onFilePick(e.target.files)}
      />
      <Upload className="mb-2 h-8 w-8 text-slate-300" />
      {files.length > 0 ? (
        <div className="space-y-1">
          {files.map((f) => (
            <p key={f.name} className="text-sm font-medium text-slate-900 dark:text-white">
              {f.name}
            </p>
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Drag & drop or click to browse
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {REPORT_TYPE_CATEGORIES.has(category)
              ? "PDF only"
              : multi
                ? "Multiple images supported"
                : "PDF, images, or documents"}
          </p>
        </>
      )}
    </div>
  );
}

function ReviewStep({
  category,
  automation,
  title,
  client,
  project,
  building,
  floor,
  fileCount,
}: {
  category: UploadCategory;
  automation: ReturnType<typeof getAutomationPreview>;
  title: string;
  client: ReturnType<typeof useAdminWorkspace>["client"];
  project: ReturnType<typeof useAdminWorkspace>["project"];
  building: string;
  floor: string;
  fileCount: number;
}) {
  const catLabel = CATEGORIES.find((c) => c.id === category)?.label ?? category;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/20">
        <Sparkles className="mt-0.5 h-5 w-5 text-emerald-600" />
        <div>
          <p className="font-medium text-slate-900 dark:text-white">Ready to process</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {catLabel}
            {title ? ` — ${title}` : ""}
            {fileCount > 0 ? ` · ${fileCount} file${fileCount === 1 ? "" : "s"}` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {client?.company_name || client?.name} → {project?.name}
            {building && ` → ${building}`}
            {floor && ` → ${floor}`}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Automations that will run
        </p>
        <ul className="space-y-2 text-sm">
          <AutomationRow active={automation.timeline} label="Create timeline entry" />
          <AutomationRow active={automation.activity} label="Write activity log" />
          <AutomationRow active={automation.clientNotify} label="Notify client users" />
          <AutomationRow active={automation.adminNotify} label="Alert admins (high/critical issues)" />
        </ul>
      </div>
    </div>
  );
}

function AutomationRow({ active, label }: { active: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2
        className={cn("h-4 w-4", active ? "text-emerald-500" : "text-slate-300")}
      />
      <span className={active ? "text-slate-700 dark:text-slate-300" : "text-slate-400"}>
        {label}
      </span>
    </li>
  );
}

function SuccessStep({
  result,
  projectId,
  category,
  onReset,
}: {
  result: UploadResult | null;
  projectId: string;
  category: UploadCategory;
  onReset: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
      <div>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">Upload complete</p>
        <p className="mt-1 text-sm text-slate-500">
          Timeline, activity log, and notifications were processed automatically.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {result?.tourId && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/tours">View tours</Link>
          </Button>
        )}
        {result?.reportId && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/reports">View reports</Link>
          </Button>
        )}
        {result?.documentId && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/documents">View documents</Link>
          </Button>
        )}
        {result?.eventId && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/timeline">View timeline</Link>
          </Button>
        )}
        {result?.issueId && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/issues">View issues</Link>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/projects/${projectId}`}>
            Project workspace
          </Link>
        </Button>
      </div>
      <Button type="button" className="ops-btn-primary" onClick={onReset}>
        Upload another {CATEGORIES.find((c) => c.id === category)?.label.toLowerCase()}
      </Button>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}
