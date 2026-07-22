-- =============================================================================
-- BuildView — Phase 16: Sample Seed Data
-- =============================================================================
-- Run after:
--   001_initial_schema.sql
--   002_rls_policies.sql
--   003_storage_buckets.sql
--
-- Idempotent: safe to re-run (uses fixed UUIDs + ON CONFLICT DO NOTHING).
--
-- Prerequisite: Register at least one user via /register, then run the
-- post-seed setup block at the bottom of this file.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Clients
-- -----------------------------------------------------------------------------
INSERT INTO clients (
  id, name, company_name, email, phone, address, subscription_status, is_active
) VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Sarah Chen',
    'Meridian Development',
    'sarah@meridiandev.com',
    '+1-555-0101',
    '100 Market St, San Francisco, CA',
    'active',
    TRUE
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Michael Torres',
    'Apex Construction Group',
    'michael@apexconstruction.com',
    '+1-555-0102',
    '250 Congress Ave, Austin, TX',
    'active',
    TRUE
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Priya Sharma',
    'Design Collective',
    'priya@designcollective.com',
    '+1-555-0103',
    '88 Pike St, Seattle, WA',
    'trial',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Projects
-- -----------------------------------------------------------------------------
INSERT INTO projects (
  id, name, client_id, client_name, location,
  start_date, completion_date, status, description
) VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'Navi Mumbai Commercial Tower',
    'a0000000-0000-0000-0000-000000000001',
    'Meridian Development',
    'Navi Mumbai, India',
    '2025-06-01',
    '2027-12-31',
    'in_progress',
    '32-story commercial tower with retail podium and underground parking.'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Pacific Heights Residence',
    'a0000000-0000-0000-0000-000000000001',
    'Meridian Development',
    'San Francisco, CA',
    '2025-09-01',
    '2026-08-31',
    'in_progress',
    'Luxury 4-story residential development with panoramic bay views.'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'Riverside Industrial Park',
    'a0000000-0000-0000-0000-000000000002',
    'Apex Construction Group',
    'Austin, TX',
    '2024-01-15',
    '2025-12-31',
    'completed',
    '500,000 sq ft warehouse and distribution facility complex.'
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'Downtown Metro Station',
    'a0000000-0000-0000-0000-000000000003',
    'Design Collective',
    'Seattle, WA',
    '2026-03-01',
    '2028-06-30',
    'planning',
    'Underground metro station with pedestrian concourse and retail spaces.'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Matterport Tours
-- -----------------------------------------------------------------------------
INSERT INTO project_tours (
  id, project_id, name, matterport_url, capture_date, description, sort_order
) VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Ground Floor - Lobby Area',
    'https://my.matterport.com/show/?m=SxQL3iGyoDo',
    '2026-01-15',
    'Initial ground floor capture showing lobby and retail spaces.',
    0
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Floor 12 - Office Space',
    'https://my.matterport.com/show/?m=SxQL3iGyoDo',
    '2026-03-01',
    'Floor 12 office space with MEP installations visible.',
    1
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'Main Residence - Level 1',
    'https://my.matterport.com/show/?m=SxQL3iGyoDo',
    '2026-02-01',
    'First floor living areas and kitchen.',
    0
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000003',
    'Warehouse Section A',
    'https://my.matterport.com/show/?m=SxQL3iGyoDo',
    '2025-06-01',
    'Completed warehouse section A with racking installed.',
    0
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Reports
-- Storage path convention: reports/{project_id}/{timestamp}-{filename}
-- -----------------------------------------------------------------------------
INSERT INTO reports (
  id, project_id, title, report_type, report_date, description,
  file_url, file_name, file_size, mime_type, storage_path
) VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'January 2026 Progress Report',
    'progress_report',
    '2026-01-31',
    'Monthly progress summary covering structural and MEP milestones.',
    'b0000000-0000-0000-0000-000000000001/1738368000000-jan-2026-progress.pdf',
    'jan-2026-progress.pdf',
    2457600,
    'application/pdf',
    'b0000000-0000-0000-0000-000000000001/1738368000000-jan-2026-progress.pdf'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Floor 8 Structural Inspection',
    'inspection_report',
    '2026-02-15',
    'Structural engineer inspection report for floor 8 concrete works.',
    'b0000000-0000-0000-0000-000000000001/1739750400000-floor-8-inspection.pdf',
    'floor-8-inspection.pdf',
    1843200,
    'application/pdf',
    'b0000000-0000-0000-0000-000000000001/1739750400000-floor-8-inspection.pdf'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'Q1 2026 Safety Audit',
    'safety_report',
    '2026-03-20',
    'Quarterly site safety audit with corrective action items.',
    'b0000000-0000-0000-0000-000000000001/1742428800000-q1-safety-audit.pdf',
    'q1-safety-audit.pdf',
    1572864,
    'application/pdf',
    'b0000000-0000-0000-0000-000000000001/1742428800000-q1-safety-audit.pdf'
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000002',
    'February 2026 Quality Report',
    'quality_report',
    '2026-02-28',
    'Finish quality review for level 1 interior works.',
    'b0000000-0000-0000-0000-000000000002/1740700800000-feb-quality.pdf',
    'feb-quality.pdf',
    1048576,
    'application/pdf',
    'b0000000-0000-0000-0000-000000000002/1740700800000-feb-quality.pdf'
  ),
  (
    'e0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000003',
    'Final Handover Report',
    'progress_report',
    '2025-12-15',
    'Project completion and handover documentation.',
    'b0000000-0000-0000-0000-000000000003/1734220800000-handover.pdf',
    'handover.pdf',
    3145728,
    'application/pdf',
    'b0000000-0000-0000-0000-000000000003/1734220800000-handover.pdf'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Document Folders
-- -----------------------------------------------------------------------------
INSERT INTO document_folders (
  id, project_id, name, parent_id, sort_order
) VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Architectural Drawings',
    NULL,
    0
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Structural Drawings',
    NULL,
    1
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'Contracts',
    NULL,
    2
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'Floor Plans',
    'd0000000-0000-0000-0000-000000000001',
    0
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000002',
    'Design Documents',
    NULL,
    0
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. Documents
-- Storage path convention: documents/{project_id}/{folder_id}/{timestamp}-{filename}
-- -----------------------------------------------------------------------------
INSERT INTO documents (
  id, project_id, folder_id, name, category, description,
  file_url, file_name, file_size, mime_type, storage_path
) VALUES
  (
    'd0c00000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000004',
    'Floor 12 Layout Plan',
    'drawings',
    'Approved architectural layout for floor 12 office space.',
    'b0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-000000000004/1738368000000-floor-12-layout.pdf',
    'floor-12-layout.pdf',
    5242880,
    'application/pdf',
    'b0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-000000000004/1738368000000-floor-12-layout.pdf'
  ),
  (
    'd0c00000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    'Structural BOQ - Tower',
    'boqs',
    'Bill of quantities for structural steel and concrete works.',
    'b0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-000000000002/1738368000000-structural-boq.xlsx',
    'structural-boq.xlsx',
    892928,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'b0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-000000000002/1738368000000-structural-boq.xlsx'
  ),
  (
    'd0c00000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000003',
    'Main Construction Contract',
    'contracts',
    'Signed EPC contract between Meridian Development and general contractor.',
    'b0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-000000000003/1738368000000-main-contract.pdf',
    'main-contract.pdf',
    4194304,
    'application/pdf',
    'b0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-000000000003/1738368000000-main-contract.pdf'
  ),
  (
    'd0c00000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000005',
    'Interior Design Specifications',
    'technical_documents',
    'Material and finish specifications for residential interiors.',
    'b0000000-0000-0000-0000-000000000002/d0000000-0000-0000-0000-000000000005/1740700800000-interior-specs.pdf',
    'interior-specs.pdf',
    2097152,
    'application/pdf',
    'b0000000-0000-0000-0000-000000000002/d0000000-0000-0000-0000-000000000005/1740700800000-interior-specs.pdf'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. Issues
-- -----------------------------------------------------------------------------
INSERT INTO issues (
  id, project_id, title, description, priority, status,
  location, due_date, resolved_at
) VALUES
  (
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Crack in Column C-14',
    'Hairline crack observed in column C-14 on floor 8. Requires structural engineer review.',
    'high',
    'open',
    'Floor 8, Grid C-14',
    '2026-04-15',
    NULL
  ),
  (
    'f0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Waterproofing Defect - Basement',
    'Water seepage detected in basement level B2 near expansion joint.',
    'critical',
    'in_progress',
    'Basement B2',
    '2026-03-30',
    NULL
  ),
  (
    'f0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'Missing Fire Stopping',
    'Fire stopping not installed at floor 12 penetrations.',
    'medium',
    'open',
    'Floor 12',
    '2026-05-01',
    NULL
  ),
  (
    'f0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000002',
    'Window Frame Alignment',
    'Minor misalignment on north-facing window frames level 2.',
    'low',
    'resolved',
    'Level 2, North Elevation',
    '2026-02-28',
    '2026-02-25 14:30:00+00'
  ),
  (
    'f0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001',
    'Facade Panel Discoloration',
    'Inconsistent panel finish on south elevation floors 10–11. Closed after replacement.',
    'medium',
    'closed',
    'South Elevation, Floors 10-11',
    '2026-02-10',
    '2026-02-08 09:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. Issue Images
-- Storage path convention: issue-images/{project_id}/{issue_id}/{timestamp}-{filename}
-- Note: Upload matching files to Supabase Storage for live previews, or use
--       placeholder URLs — the app falls back to signed URL generation.
-- -----------------------------------------------------------------------------
INSERT INTO issue_images (
  id, issue_id, image_url, storage_path, caption, sort_order
) VALUES
  (
    '1aa00000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001/f0000000-0000-0000-0000-000000000001/1738368000000-crack-c14.jpg',
    'b0000000-0000-0000-0000-000000000001/f0000000-0000-0000-0000-000000000001/1738368000000-crack-c14.jpg',
    'Hairline crack on column C-14',
    0
  ),
  (
    '1aa00000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001/f0000000-0000-0000-0000-000000000001/1738368000001-crack-c14-closeup.jpg',
    'b0000000-0000-0000-0000-000000000001/f0000000-0000-0000-0000-000000000001/1738368000001-crack-c14-closeup.jpg',
    'Close-up of crack width',
    1
  ),
  (
    '1aa00000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001/f0000000-0000-0000-0000-000000000002/1739750400000-basement-seepage.jpg',
    'b0000000-0000-0000-0000-000000000001/f0000000-0000-0000-0000-000000000002/1739750400000-basement-seepage.jpg',
    'Water seepage at expansion joint B2',
    0
  ),
  (
    '1aa00000-0000-0000-0000-000000000004',
    'f0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000002/f0000000-0000-0000-0000-000000000004/1740700800000-window-alignment.jpg',
    'b0000000-0000-0000-0000-000000000002/f0000000-0000-0000-0000-000000000004/1740700800000-window-alignment.jpg',
    'Window frame misalignment — north elevation',
    0
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. Timeline Events
-- -----------------------------------------------------------------------------
INSERT INTO timeline_events (
  id, project_id, event_date, title, progress_note,
  tour_id, report_id, sort_order
) VALUES
  (
    'g0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '2025-06-15',
    'Project Kickoff',
    'Site mobilization completed. Foundation excavation began. Temporary site offices erected and safety perimeter established.',
    NULL,
    NULL,
    0
  ),
  (
    'g0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    '2025-09-01',
    'Foundation Complete',
    'All foundation work completed and approved by structural engineer. Basement waterproofing membrane installed.',
    NULL,
    NULL,
    1
  ),
  (
    'g0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    '2025-12-15',
    'Structure to Floor 10',
    'Structural frame completed up to floor 10. MEP rough-in started on floors 6–8.',
    NULL,
    'e0000000-0000-0000-0000-000000000001',
    2
  ),
  (
    'g0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    '2026-03-01',
    'Floor 12 Capture',
    'Matterport capture of floor 12 showing MEP progress and facade installation. Linked to January progress report.',
    'c0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    3
  ),
  (
    'g0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000002',
    '2026-02-01',
    'Level 1 Interior Complete',
    'First floor interior fit-out completed. Virtual tour captured for client review.',
    'c0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000004',
    0
  ),
  (
    'g0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000003',
    '2025-12-15',
    'Project Handover',
    'Riverside Industrial Park completed and handed over to client. Final documentation submitted.',
    'c0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000005',
    0
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. Timeline Photos
-- Storage path convention: timeline-photos/{project_id}/{event_id}/{timestamp}-{filename}
-- -----------------------------------------------------------------------------
INSERT INTO timeline_photos (
  id, timeline_event_id, image_url, storage_path, caption, sort_order
) VALUES
  (
    'f0a00000-0000-0000-0000-000000000001',
    'g0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001/g0000000-0000-0000-0000-000000000001/1738368000000-site-mobilization.jpg',
    'b0000000-0000-0000-0000-000000000001/g0000000-0000-0000-0000-000000000001/1738368000000-site-mobilization.jpg',
    'Site mobilization — crane and excavation',
    0
  ),
  (
    'f0a00000-0000-0000-0000-000000000002',
    'g0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001/g0000000-0000-0000-0000-000000000002/1738368000000-foundation-complete.jpg',
    'b0000000-0000-0000-0000-000000000001/g0000000-0000-0000-0000-000000000002/1738368000000-foundation-complete.jpg',
    'Completed foundation slab',
    0
  ),
  (
    'f0a00000-0000-0000-0000-000000000003',
    'g0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001/g0000000-0000-0000-0000-000000000004/1740700800000-floor12-mep.jpg',
    'b0000000-0000-0000-0000-000000000001/g0000000-0000-0000-0000-000000000004/1740700800000-floor12-mep.jpg',
    'Floor 12 MEP rough-in progress',
    0
  ),
  (
    'f0a00000-0000-0000-0000-000000000004',
    'g0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001/g0000000-0000-0000-0000-000000000004/1740700800001-floor12-facade.jpg',
    'b0000000-0000-0000-0000-000000000001/g0000000-0000-0000-0000-000000000004/1740700800001-floor12-facade.jpg',
    'Facade panel installation floor 12',
    1
  ),
  (
    'f0a00000-0000-0000-0000-000000000005',
    'g0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000002/g0000000-0000-0000-0000-000000000005/1740700800000-level1-interior.jpg',
    'b0000000-0000-0000-0000-000000000002/g0000000-0000-0000-0000-000000000005/1740700800000-level1-interior.jpg',
    'Level 1 living area — finished interior',
    0
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 11. Invoices
-- -----------------------------------------------------------------------------
INSERT INTO invoices (
  id, client_id, project_id, invoice_number, amount, currency,
  status, issued_date, due_date, paid_date, description
) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'INV-2026-001',
    4999.00,
    'USD',
    'paid',
    '2026-01-15',
    '2026-02-15',
    '2026-02-10',
    'Q1 2026 monitoring services — Navi Mumbai Tower'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'INV-2026-002',
    2499.00,
    'USD',
    'sent',
    '2026-03-01',
    '2026-04-01',
    NULL,
    'Q1 2026 monitoring services — Pacific Heights'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'INV-2026-003',
    3499.00,
    'USD',
    'paid',
    '2026-01-01',
    '2026-01-31',
    '2026-01-28',
    'Final monitoring package — Riverside Industrial'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'INV-2026-004',
    1999.00,
    'USD',
    'draft',
    '2026-06-01',
    '2026-07-01',
    NULL,
    'Pre-construction monitoring setup — Downtown Metro Station'
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'INV-2025-012',
    4999.00,
    'USD',
    'overdue',
    '2025-10-01',
    '2025-11-01',
    NULL,
    'Q4 2025 monitoring services — Navi Mumbai Tower'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12. Activity Logs (append-only audit trail; user_id optional)
-- -----------------------------------------------------------------------------
INSERT INTO activity_logs (
  id, project_id, action, entity_type, entity_id, metadata, created_at
) VALUES
  (
    'a0c00000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'created',
    'project',
    'b0000000-0000-0000-0000-000000000001',
    '{"name": "Navi Mumbai Commercial Tower"}'::jsonb,
    '2025-06-01 08:00:00+00'
  ),
  (
    'a0c00000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'uploaded',
    'report',
    'e0000000-0000-0000-0000-000000000001',
    '{"title": "January 2026 Progress Report"}'::jsonb,
    '2026-02-01 10:30:00+00'
  ),
  (
    'a0c00000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'created',
    'issue',
    'f0000000-0000-0000-0000-000000000002',
    '{"title": "Waterproofing Defect - Basement", "priority": "critical"}'::jsonb,
    '2026-03-05 14:15:00+00'
  ),
  (
    'a0c00000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'captured',
    'tour',
    'c0000000-0000-0000-0000-000000000002',
    '{"name": "Floor 12 - Office Space"}'::jsonb,
    '2026-03-01 09:00:00+00'
  ),
  (
    'a0c00000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000002',
    'resolved',
    'issue',
    'f0000000-0000-0000-0000-000000000004',
    '{"title": "Window Frame Alignment"}'::jsonb,
    '2026-02-25 14:30:00+00'
  ),
  (
    'a0c00000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000003',
    'completed',
    'project',
    'b0000000-0000-0000-0000-000000000003',
    '{"name": "Riverside Industrial Park", "status": "completed"}'::jsonb,
    '2025-12-15 16:00:00+00'
  ),
  (
    'a0c00000-0000-0000-0000-000000000007',
    'b0000000-0000-0000-0000-000000000001',
    'created',
    'timeline_event',
    'g0000000-0000-0000-0000-000000000004',
    '{"title": "Floor 12 Capture"}'::jsonb,
    '2026-03-01 11:00:00+00'
  ),
  (
    'a0c00000-0000-0000-0000-000000000008',
    NULL,
    'paid',
    'invoice',
    '10000000-0000-0000-0000-000000000001',
    '{"invoice_number": "INV-2026-001", "amount": 4999.00}'::jsonb,
    '2026-02-10 12:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Post-seed setup (run after registering users via /register)
-- =============================================================================
-- Promote your account to super admin:
--
--   UPDATE public.users
--   SET role = 'super_admin', client_id = NULL
--   WHERE email = 'your-admin@buildview.com';
--
-- Link a client user to Meridian Development and assign Navi Mumbai project:
--
--   UPDATE public.users
--   SET role = 'client', client_id = 'a0000000-0000-0000-0000-000000000001'
--   WHERE email = 'client@meridiandev.com';
--
--   INSERT INTO project_assignments (project_id, user_id)
--   SELECT 'b0000000-0000-0000-0000-000000000001', id
--   FROM public.users
--   WHERE email = 'client@meridiandev.com'
--   ON CONFLICT (project_id, user_id) DO NOTHING;
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 13. Notifications (seeded only when a super_admin user already exists)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  admin_user_id UUID;
  client_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id
  FROM public.users
  WHERE role = 'super_admin' AND deleted_at IS NULL
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO notifications (id, user_id, title, message, type, link) VALUES
      (
        '0bf00000-0000-0000-0000-000000000001',
        admin_user_id,
        'Critical Issue Reported',
        'Waterproofing defect reported at Navi Mumbai Tower — Basement B2.',
        'issue_update',
        '/admin/issues'
      ),
      (
        '0bf00000-0000-0000-0000-000000000002',
        admin_user_id,
        'New Report Uploaded',
        'January 2026 Progress Report uploaded for Navi Mumbai Commercial Tower.',
        'project_update',
        '/admin/reports'
      ),
      (
        '0bf00000-0000-0000-0000-000000000003',
        admin_user_id,
        'Invoice Overdue',
        'Invoice INV-2025-012 is overdue for Meridian Development.',
        'invoice_update',
        '/admin/invoices'
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id INTO client_user_id
  FROM public.users
  WHERE role = 'client'
    AND client_id = 'a0000000-0000-0000-0000-000000000001'
    AND deleted_at IS NULL
  LIMIT 1;

  IF client_user_id IS NOT NULL THEN
    INSERT INTO notifications (id, user_id, title, message, type, link, is_read) VALUES
      (
        '0bf00000-0000-0000-0000-000000000004',
        client_user_id,
        'Floor 12 Virtual Tour Available',
        'A new Matterport capture of Floor 12 is ready to view.',
        'project_update',
        '/dashboard/projects/b0000000-0000-0000-0000-000000000001',
        FALSE
      ),
      (
        '0bf00000-0000-0000-0000-000000000005',
        client_user_id,
        'Progress Report Ready',
        'January 2026 Progress Report is available for download.',
        'project_update',
        '/dashboard/reports',
        TRUE
      )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO project_assignments (project_id, user_id)
    VALUES
      ('b0000000-0000-0000-0000-000000000001', client_user_id),
      ('b0000000-0000-0000-0000-000000000002', client_user_id)
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
END $$;
