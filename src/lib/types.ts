/**
 * BuildView — Supabase Database Types
 * Generated to match: supabase/migrations/001_initial_schema.sql
 */

// =============================================================================
// JSON (Supabase standard)
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// =============================================================================
// ENUM Types
// =============================================================================

export type UserRole =
  | "super_admin"
  | "admin"
  | "operations_manager"
  | "site_engineer"
  | "client"
  | "client_admin"
  | "client_user"
  | "read_only_client"
  | "consultant";

export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "completed"
  | "on_hold";

export type ReportType =
  | "progress_report"
  | "quality_report"
  | "inspection_report"
  | "safety_report";

export type DocumentCategory =
  | "drawings"
  | "boqs"
  | "contracts"
  | "approvals"
  | "technical_documents"
  | "other";

export type IssuePriority = "low" | "medium" | "high" | "critical";

export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export type CommentStatus = "open" | "resolved";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled";

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "trial"
  | "cancelled";

export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "project_update"
  | "issue_update"
  | "invoice_update";

// =============================================================================
// Shared field groups
// =============================================================================

export type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type AuditFields = {
  created_by: string | null;
  updated_by: string | null;
};

export type SoftDeleteFields = {
  deleted_at: string | null;
  deleted_by: string | null;
};

export type FullAuditFields = AuditFields & SoftDeleteFields;

// =============================================================================
// Storage
// =============================================================================

export const STORAGE_BUCKETS = {
  REPORTS: "reports",
  DOCUMENTS: "documents",
  ISSUE_IMAGES: "issue-images",
  TIMELINE_PHOTOS: "timeline-photos",
  AVATARS: "avatars",
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

// =============================================================================
// Supabase Database schema
// =============================================================================

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: ClientInsert;
        Update: ClientUpdate;
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_deleted_by_fkey";
            columns: ["deleted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
        Relationships: [
          {
            foreignKeyName: "users_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      project_assignments: {
        Row: ProjectAssignment;
        Insert: ProjectAssignmentInsert;
        Update: ProjectAssignmentUpdate;
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_assignments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      buildings: {
        Row: Building;
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          name?: string;
          sort_order?: number;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      floors: {
        Row: Floor;
        Insert: {
          id?: string;
          building_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          name?: string;
          sort_order?: number;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          id: string;
          company_name: string;
          support_email: string;
          default_currency: string;
          timezone: string;
          notification_rules: {
            onUpload?: boolean;
            onCriticalIssue?: boolean;
            onInvoiceSent?: boolean;
          };
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          company_name?: string;
          support_email?: string;
          default_currency?: string;
          timezone?: string;
          notification_rules?: Record<string, boolean>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          company_name?: string;
          support_email?: string;
          default_currency?: string;
          timezone?: string;
          notification_rules?: Record<string, boolean>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      project_tours: {
        Row: ProjectTour;
        Insert: ProjectTourInsert;
        Update: ProjectTourUpdate;
        Relationships: [
          {
            foreignKeyName: "project_tours_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: Report;
        Insert: ReportInsert;
        Update: ReportUpdate;
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      document_folders: {
        Row: DocumentFolder;
        Insert: DocumentFolderInsert;
        Update: DocumentFolderUpdate;
        Relationships: [
          {
            foreignKeyName: "document_folders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "document_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: Document;
        Insert: DocumentInsert;
        Update: DocumentUpdate;
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "document_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      issues: {
        Row: Issue;
        Insert: IssueInsert;
        Update: IssueUpdate;
        Relationships: [
          {
            foreignKeyName: "issues_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_images: {
        Row: IssueImage;
        Insert: IssueImageInsert;
        Update: IssueImageUpdate;
        Relationships: [
          {
            foreignKeyName: "issue_images_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
      project_comments: {
        Row: ProjectComment;
        Insert: ProjectCommentInsert;
        Update: ProjectCommentUpdate;
        Relationships: [
          {
            foreignKeyName: "project_comments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_comments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      timeline_events: {
        Row: TimelineEvent;
        Insert: TimelineEventInsert;
        Update: TimelineEventUpdate;
        Relationships: [
          {
            foreignKeyName: "timeline_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timeline_events_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "project_tours";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timeline_events_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
      timeline_photos: {
        Row: TimelinePhoto;
        Insert: TimelinePhotoInsert;
        Update: TimelinePhotoUpdate;
        Relationships: [
          {
            foreignKeyName: "timeline_photos_timeline_event_id_fkey";
            columns: ["timeline_event_id"];
            isOneToOne: false;
            referencedRelation: "timeline_events";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: Invoice;
        Insert: InvoiceInsert;
        Update: InvoiceUpdate;
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: Notification;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: ActivityLogInsert;
        Update: ActivityLogUpdate;
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_comparisons: {
        Row: SavedComparisonRecord;
        Insert: SavedComparisonInsert;
        Update: SavedComparisonUpdate;
        Relationships: [
          {
            foreignKeyName: "saved_comparisons_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_comparisons_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_comparisons_tour_a_id_fkey";
            columns: ["tour_a_id"];
            isOneToOne: false;
            referencedRelation: "project_tours";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_comparisons_tour_b_id_fkey";
            columns: ["tour_b_id"];
            isOneToOne: false;
            referencedRelation: "project_tours";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_comparisons_building_id_fkey";
            columns: ["building_id"];
            isOneToOne: false;
            referencedRelation: "buildings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_comparisons_floor_id_fkey";
            columns: ["floor_id"];
            isOneToOne: false;
            referencedRelation: "floors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_comparisons_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      active_projects: {
        Row: Project;
        Relationships: [];
      };
      active_issues: {
        Row: Issue;
        Relationships: [];
      };
    };
    Functions: {
      current_user_profile: {
        Args: Record<string, never>;
        Returns: User;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_active_authenticated_user: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_my_client_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      has_project_access: {
        Args: { project_uuid: string };
        Returns: boolean;
      };
      has_issue_access: {
        Args: { issue_uuid: string };
        Returns: boolean;
      };
      has_timeline_event_access: {
        Args: { event_uuid: string };
        Returns: boolean;
      };
      has_folder_access: {
        Args: { folder_uuid: string };
        Returns: boolean;
      };
      storage_project_id: {
        Args: { object_path: string };
        Returns: string;
      };
      storage_user_id: {
        Args: { object_path: string };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      report_type: ReportType;
      document_category: DocumentCategory;
      issue_priority: IssuePriority;
      issue_status: IssueStatus;
      comment_status: CommentStatus;
      invoice_status: InvoiceStatus;
      subscription_status: SubscriptionStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
}

// =============================================================================
// Table Row types
// =============================================================================

// Table Row types — use `type` (not `interface`) so rows satisfy Supabase's
// GenericTable constraint: Row extends Record<string, unknown>.

export type Client = Timestamps &
  FullAuditFields & {
    id: string;
    name: string;
    company_name: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    logo_url: string | null;
    subscription_status: SubscriptionStatus;
    is_active: boolean;
    dashboard_type?: ClientDashboardType;
  };

export type ClientDashboardType = "construction" | "portfolio";

export type User = Timestamps &
  FullAuditFields & {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    client_id: string | null;
    avatar_url: string | null;
    phone: string | null;
    is_active: boolean;
    /** Overrides client org default when set */
    dashboard_type?: ClientDashboardType | null;
  };

export type PortfolioCategory = "architecture" | "interior" | "real_estate";

export const PORTFOLIO_CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  architecture: "Architecture",
  interior: "Interior",
  real_estate: "Real Estate",
};

export type Project = Timestamps &
  FullAuditFields & {
    id: string;
    name: string;
    client_id: string;
    client_name: string;
    location: string;
    description: string | null;
    status: ProjectStatus;
    start_date: string | null;
    completion_date: string | null;
    cover_image_url: string | null;
    /** Square footage for portfolio showcase */
    area_sqft?: number | null;
    /** architecture | interior | real_estate */
    portfolio_category?: PortfolioCategory | null;
  };

export type ProjectAssignment = Timestamps &
  FullAuditFields & {
    id: string;
    project_id: string;
    user_id: string;
    assigned_by: string | null;
  };

export type ProjectTour = Timestamps &
  FullAuditFields & {
    id: string;
    project_id: string;
    name: string;
    matterport_url: string;
    capture_date: string | null;
    description: string | null;
    thumbnail_url: string | null;
    sort_order: number;
    building_id?: string | null;
    floor_id?: string | null;
  };

export type Building = Timestamps & {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  deleted_at: string | null;
};

export type Floor = Timestamps & {
  id: string;
  building_id: string;
  name: string;
  sort_order: number;
  deleted_at: string | null;
};

export type Report = Timestamps &
  FullAuditFields & {
    id: string;
    project_id: string;
    title: string;
    report_type: ReportType;
    report_date: string;
    description: string | null;
    file_url: string;
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    storage_path: string | null;
    building?: string | null;
    floor?: string | null;
    building_id?: string | null;
    floor_id?: string | null;
  };

export type DocumentFolder = Timestamps &
  FullAuditFields & {
    id: string;
    project_id: string;
    name: string;
    parent_id: string | null;
    sort_order: number;
  };

export type Document = Timestamps &
  FullAuditFields & {
    id: string;
    project_id: string;
    folder_id: string | null;
    name: string;
    category: DocumentCategory;
    description: string | null;
    file_url: string;
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    storage_path: string | null;
    building?: string | null;
    floor?: string | null;
    building_id?: string | null;
    floor_id?: string | null;
    document_group_id?: string;
    version_number?: number;
    is_current?: boolean;
  };

export type Issue = Timestamps &
  FullAuditFields & {
    id: string;
    project_id: string;
    title: string;
    description: string | null;
    priority: IssuePriority;
    status: IssueStatus;
    location: string | null;
    building?: string | null;
    floor?: string | null;
    building_id?: string | null;
    floor_id?: string | null;
    assigned_to: string | null;
    due_date: string | null;
    resolved_at: string | null;
  };

export type IssueImage = Timestamps &
  FullAuditFields & {
    id: string;
    issue_id: string;
    image_url: string;
    storage_path: string | null;
    caption: string | null;
    sort_order: number;
  };

export type ProjectComment = Timestamps &
  FullAuditFields & {
    id: string;
    project_id: string;
    message: string;
    status: CommentStatus;
  };

export type TimelineTradeJson = {
  name: string;
  percent: number;
  color?: string;
};

export type TimelineEvent = Timestamps &
  FullAuditFields & {
    id: string;
    project_id: string;
    event_date: string;
    title: string;
    progress_note: string | null;
    tour_id: string | null;
    report_id: string | null;
    sort_order: number;
    status?: "in_progress" | "completed";
    progress_percent?: number | null;
    trades?: TimelineTradeJson[] | Json;
    whats_new?: string[] | null;
    author_name?: string | null;
    building?: string | null;
    floor?: string | null;
    building_id?: string | null;
    floor_id?: string | null;
  };

export type TimelinePhoto = Timestamps &
  FullAuditFields & {
    id: string;
    timeline_event_id: string;
    image_url: string;
    storage_path: string | null;
    caption: string | null;
    sort_order: number;
  };

export type Invoice = Timestamps &
  FullAuditFields & {
    id: string;
    client_id: string;
    project_id: string | null;
    invoice_number: string;
    amount: number;
    currency: string;
    status: InvoiceStatus;
    due_date: string | null;
    issued_date: string;
    paid_date: string | null;
    description: string | null;
    file_url: string | null;
    storage_path: string | null;
  };

export type Notification = Timestamps &
  FullAuditFields & {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: NotificationType;
    is_read: boolean;
    link: string | null;
    read_at: string | null;
  };

export type ActivityLog = {
  id: string;
  user_id: string | null;
  project_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type SavedComparisonRecord = Timestamps & {
  id: string;
  user_id: string;
  name: string;
  project_id: string;
  tour_a_id: string;
  tour_b_id: string;
  building: string;
  floor: string;
  building_id: string | null;
  floor_id: string | null;
  client_id: string | null;
};

// =============================================================================
// Insert types (omit auto-generated / defaulted fields)
// =============================================================================

export type ClientInsert = {
  id?: string;
  name: string;
  company_name?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  subscription_status?: SubscriptionStatus;
  is_active?: boolean;
  created_by?: string | null;
  updated_by?: string | null;
};

export type UserInsert = Omit<
  User,
  "created_at" | "updated_at" | "deleted_at" | "deleted_by"
> & {
  role?: UserRole;
  is_active?: boolean;
  created_by?: string | null;
  updated_by?: string | null;
};

export type ProjectInsert = {
  id?: string;
  name: string;
  client_id: string;
  client_name: string;
  location: string;
  description?: string | null;
  status?: ProjectStatus;
  start_date?: string | null;
  completion_date?: string | null;
  cover_image_url?: string | null;
  area_sqft?: number | null;
  portfolio_category?: PortfolioCategory | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type ProjectTourInsert = {
  id?: string;
  project_id: string;
  name: string;
  matterport_url: string;
  capture_date?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  sort_order?: number;
  building_id?: string | null;
  floor_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type ReportInsert = {
  id?: string;
  project_id: string;
  title: string;
  report_type: ReportType;
  report_date: string;
  description?: string | null;
  file_url: string;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  storage_path?: string | null;
  building?: string | null;
  floor?: string | null;
  building_id?: string | null;
  floor_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type DocumentInsert = {
  id?: string;
  project_id: string;
  folder_id?: string | null;
  name: string;
  category?: DocumentCategory;
  description?: string | null;
  file_url: string;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  storage_path?: string | null;
  building?: string | null;
  floor?: string | null;
  building_id?: string | null;
  floor_id?: string | null;
  document_group_id?: string;
  version_number?: number;
  is_current?: boolean;
  created_by?: string | null;
  updated_by?: string | null;
};

export type InvoiceInsert = {
  id?: string;
  client_id: string;
  project_id?: string | null;
  invoice_number: string;
  amount: number;
  currency?: string;
  status?: InvoiceStatus;
  due_date?: string | null;
  issued_date?: string;
  paid_date?: string | null;
  description?: string | null;
  file_url?: string | null;
  storage_path?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type ProjectAssignmentInsert = {
  id?: string;
  project_id: string;
  user_id: string;
  assigned_by?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type DocumentFolderInsert = Omit<
  DocumentFolder,
  "id" | "created_at" | "updated_at" | "deleted_at" | "deleted_by"
> & {
  id?: string;
  sort_order?: number;
  created_by?: string | null;
  updated_by?: string | null;
};

export type IssueInsert = Omit<
  Issue,
  "id" | "created_at" | "updated_at" | "deleted_at" | "deleted_by"
> & {
  id?: string;
  priority?: IssuePriority;
  status?: IssueStatus;
  resolved_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type ProjectCommentInsert = Omit<
  ProjectComment,
  "id" | "created_at" | "updated_at" | "deleted_at" | "deleted_by"
> & {
  id?: string;
  status?: CommentStatus;
  created_by?: string | null;
  updated_by?: string | null;
};

export type IssueImageInsert = Omit<
  IssueImage,
  "id" | "created_at" | "updated_at" | "deleted_at" | "deleted_by"
> & {
  id?: string;
  sort_order?: number;
  created_by?: string | null;
  updated_by?: string | null;
};

export type TimelineEventInsert = Omit<
  TimelineEvent,
  "id" | "created_at" | "updated_at" | "deleted_at" | "deleted_by"
> & {
  id?: string;
  sort_order?: number;
  created_by?: string | null;
  updated_by?: string | null;
};

export type TimelinePhotoInsert = Omit<
  TimelinePhoto,
  "id" | "created_at" | "updated_at" | "deleted_at" | "deleted_by"
> & {
  id?: string;
  sort_order?: number;
  created_by?: string | null;
  updated_by?: string | null;
};

export type NotificationInsert = Omit<
  Notification,
  "id" | "created_at" | "updated_at" | "deleted_at" | "deleted_by"
> & {
  id?: string;
  type?: NotificationType;
  is_read?: boolean;
  created_by?: string | null;
  updated_by?: string | null;
};

export type ActivityLogInsert = Omit<ActivityLog, "id" | "created_at"> & {
  id?: string;
  metadata?: Json;
};

export type SavedComparisonInsert = {
  id?: string;
  user_id: string;
  name: string;
  project_id: string;
  tour_a_id: string;
  tour_b_id: string;
  building?: string;
  floor?: string;
  building_id?: string | null;
  floor_id?: string | null;
  client_id?: string | null;
};

// =============================================================================
// Update types (all fields optional except id handled separately)
// =============================================================================

export type ClientUpdate = Partial<ClientInsert> & Partial<SoftDeleteFields>;
export type UserUpdate = Partial<UserInsert>;
export type ProjectUpdate = Partial<ProjectInsert> & Partial<SoftDeleteFields>;
export type ProjectAssignmentUpdate = Partial<ProjectAssignmentInsert> & Partial<SoftDeleteFields>;
export type ProjectTourUpdate = Partial<ProjectTourInsert>;
export type ReportUpdate = Partial<ReportInsert>;
export type DocumentFolderUpdate = Partial<DocumentFolderInsert>;
export type DocumentUpdate = Partial<DocumentInsert>;
export type IssueUpdate = Partial<IssueInsert>;
export type IssueImageUpdate = Partial<IssueImageInsert>;
export type ProjectCommentUpdate = Partial<ProjectCommentInsert> &
  Partial<SoftDeleteFields> & {
    updated_by?: string | null;
  };
export type TimelineEventUpdate = Partial<TimelineEventInsert>;
export type TimelinePhotoUpdate = Partial<TimelinePhotoInsert>;
export type InvoiceUpdate = Partial<InvoiceInsert>;
export type NotificationUpdate = Partial<NotificationInsert>;
export type ActivityLogUpdate = Partial<ActivityLogInsert>;
export type SavedComparisonUpdate = Partial<SavedComparisonInsert> & Partial<SoftDeleteFields>;

// =============================================================================
// Supabase client helpers
// =============================================================================

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

// =============================================================================
// Relation / query result types (joined data from Supabase selects)
// =============================================================================

export type UserSummary = Pick<User, "id" | "full_name" | "email" | "avatar_url">;

export type ClientSummary = Pick<Client, "id" | "name" | "company_name" | "email">;

export type ProjectSummary = Pick<
  Project,
  "id" | "name" | "location" | "status" | "client_name" | "cover_image_url"
>;

export interface IssueWithRelations extends Issue {
  issue_images?: IssueImage[];
  assigned_user?: UserSummary | null;
  created_by_user?: UserSummary | null;
}

export interface ProjectCommentWithUser extends ProjectComment {
  author?: (UserSummary & { role: UserRole }) | null;
}

export interface TimelineEventWithRelations extends TimelineEvent {
  timeline_photos?: TimelinePhoto[];
  tour?: ProjectTour | null;
  report?: Report | null;
}

export interface DocumentWithFolder extends Document {
  folder?: DocumentFolder | null;
}

export interface DocumentFolderWithChildren extends DocumentFolder {
  documents?: Document[];
  children?: DocumentFolder[];
}

export interface ProjectWithRelations extends Project {
  client?: Client | null;
  project_tours?: ProjectTour[];
  reports?: Report[];
  documents?: Document[];
  issues?: IssueWithRelations[];
  timeline_events?: TimelineEventWithRelations[];
  assignments?: ProjectAssignment[];
}

export interface InvoiceWithRelations extends Invoice {
  client?: ClientSummary | null;
  project?: ProjectSummary | null;
}

export interface ActivityLogWithUser extends ActivityLog {
  user?: UserSummary | null;
  project?: ProjectSummary | null;
}

export interface NotificationWithUser extends Notification {
  user?: UserSummary | null;
}

// =============================================================================
// Application-specific types
// =============================================================================

export interface DashboardStats {
  totalProjects: number;
  openIssues: number;
  latestReports: Report[];
  recentActivity: ActivityLogWithUser[];
  projectsByStatus: { status: ProjectStatus; count: number }[];
  monthlyActivity: { month: string; count: number }[];
}

export interface AuthUserProfile extends User {
  client?: Client | null;
}

// =============================================================================
// Form / action input types
// =============================================================================

export interface CreateClientInput {
  name: string;
  company_name?: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_status?: SubscriptionStatus;
}

export interface CreateProjectInput {
  name: string;
  client_id: string;
  client_name: string;
  location: string;
  start_date?: string;
  completion_date?: string;
  status?: ProjectStatus;
  description?: string;
  cover_image_url?: string;
}

export interface CreateTourInput {
  project_id: string;
  name: string;
  matterport_url: string;
  capture_date?: string;
  description?: string;
  thumbnail_url?: string;
  sort_order?: number;
}

export interface CreateReportInput {
  project_id: string;
  title: string;
  report_type: ReportType;
  report_date: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  storage_path?: string;
}

export interface CreateDocumentInput {
  project_id: string;
  folder_id?: string;
  name: string;
  category: DocumentCategory;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  storage_path?: string;
}

export interface CreateIssueInput {
  project_id: string;
  title: string;
  description?: string;
  priority?: IssuePriority;
  status?: IssueStatus;
  location?: string;
  assigned_to?: string;
  due_date?: string;
}

export interface CreateTimelineEventInput {
  project_id: string;
  event_date: string;
  title: string;
  progress_note?: string;
  tour_id?: string;
  report_id?: string;
  sort_order?: number;
}

export interface CreateInvoiceInput {
  client_id: string;
  project_id?: string;
  invoice_number: string;
  amount: number;
  currency?: string;
  status?: InvoiceStatus;
  due_date?: string;
  issued_date?: string;
  description?: string;
  file_url?: string;
  storage_path?: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

// =============================================================================
// Label maps (UI display)
// =============================================================================

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
};

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  progress_report: "Progress Report",
  quality_report: "Quality Report",
  inspection_report: "Inspection Report",
  safety_report: "Safety Report",
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  drawings: "Drawings",
  boqs: "BOQs",
  contracts: "Contracts",
  approvals: "Approvals",
  technical_documents: "Technical Documents",
  other: "Other",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  operations_manager: "Operations Manager",
  site_engineer: "Site Engineer",
  client: "Client",
  client_admin: "Client Admin",
  client_user: "Client User",
  read_only_client: "Read Only",
  consultant: "Consultant",
};
