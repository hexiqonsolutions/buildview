-- =============================================================================
-- 053 — Construction methods: Conventional, Mivan, Hybrid
--
-- * projects.construction_method (default for the project, 'conventional')
-- * buildings / floors .construction_method (NULL = inherit)
-- * progression_templates.method / track; progression_template_steps.step_key
--   (shared step titles share a key so history carries over on a method switch)
-- * Mivan and Hybrid checklist templates (Structure cycle / Finishing)
-- * Default zone trades per method (completion_activities.method)
--
-- Template rows are generated from src/lib/progression/methods.ts by
-- scripts/generate-method-templates.cjs. Existing projects stay conventional,
-- so no current % changes. Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS construction_method TEXT NOT NULL DEFAULT 'conventional';
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS construction_method TEXT;
ALTER TABLE public.floors
  ADD COLUMN IF NOT EXISTS construction_method TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_construction_method_check') THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_construction_method_check
      CHECK (construction_method IN ('conventional', 'mivan', 'hybrid'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'buildings_construction_method_check') THEN
    ALTER TABLE public.buildings ADD CONSTRAINT buildings_construction_method_check
      CHECK (construction_method IS NULL OR construction_method IN ('conventional', 'mivan', 'hybrid'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'floors_construction_method_check') THEN
    ALTER TABLE public.floors ADD CONSTRAINT floors_construction_method_check
      CHECK (construction_method IS NULL OR construction_method IN ('conventional', 'mivan', 'hybrid'));
  END IF;
END $$;

ALTER TABLE public.progression_templates
  ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'conventional',
  ADD COLUMN IF NOT EXISTS track TEXT;
ALTER TABLE public.progression_template_steps
  ADD COLUMN IF NOT EXISTS step_key TEXT;

-- Default trades per method: conventional keeps today's rows.
ALTER TABLE public.completion_activities
  ADD COLUMN IF NOT EXISTS method TEXT;
UPDATE public.completion_activities SET method = 'conventional'
 WHERE project_id IS NULL AND method IS NULL;
DROP INDEX IF EXISTS public.completion_activities_default_key;
CREATE UNIQUE INDEX IF NOT EXISTS completion_activities_default_method_key
  ON public.completion_activities (method, key) WHERE project_id IS NULL;

-- ---------------------------------------------------------------------------
-- Generated templates and trades
-- ---------------------------------------------------------------------------
-- Pre-Slab (conventional) (56 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track)
VALUES ('pre_slab_v1', 'Pre-Slab (conventional)', 1, TRUE, 'conventional', 'pre_slab')
ON CONFLICT (key) DO UPDATE SET method = EXCLUDED.method, track = EXCLUDED.track;
INSERT INTO public.progression_template_steps (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Previous slab curing and de-shuttering, as permitted by the engineer', 'previous_slab_curing_and_de_shuttering_as_permitted_by_the_engineer'),
  (2, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Surveying and marking column locations and grid lines', 'surveying_and_marking_column_locations_and_grid_lines'),
  (3, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column reinforcement cutting, bending and fixing', 'column_reinforcement_cutting_bending_and_fixing'),
  (4, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column stirrups / ties installation', 'column_stirrups_ties_installation'),
  (5, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column reinforcement inspection and cover-block placement', 'column_reinforcement_inspection_and_cover_block_placement'),
  (6, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column formwork / shuttering installation', 'column_formwork_shuttering_installation'),
  (7, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column verticality, dimensions and alignment checks', 'column_verticality_dimensions_and_alignment_checks'),
  (8, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column concreting, where columns are cast separately from the slab', 'column_concreting_where_columns_are_cast_separately_from_the_slab'),
  (9, 2, 'Beam and slab formwork', 'Formwork stage', 'Material shifting and floor preparation', 'material_shifting_and_floor_preparation'),
  (10, 2, 'Beam and slab formwork', 'Formwork stage', 'Prop / staging / scaffolding installation', 'prop_staging_scaffolding_installation'),
  (11, 2, 'Beam and slab formwork', 'Formwork stage', 'Beam bottom shuttering installation', 'beam_bottom_shuttering_installation'),
  (12, 2, 'Beam and slab formwork', 'Formwork stage', 'Beam side shuttering installation', 'beam_side_shuttering_installation'),
  (13, 2, 'Beam and slab formwork', 'Formwork stage', 'Slab centering and deck shuttering installation', 'slab_centering_and_deck_shuttering_installation'),
  (14, 2, 'Beam and slab formwork', 'Formwork stage', 'Checking formwork levels, line, level and alignment', 'checking_formwork_levels_line_level_and_alignment'),
  (15, 2, 'Beam and slab formwork', 'Formwork stage', 'Checking supports, bracing and formwork stability', 'checking_supports_bracing_and_formwork_stability'),
  (16, 2, 'Beam and slab formwork', 'Formwork stage', 'Applying approved shuttering release agent', 'applying_approved_shuttering_release_agent'),
  (17, 2, 'Beam and slab formwork', 'Formwork stage', 'Providing slab openings, shafts and service cut-outs as per drawings', 'providing_slab_openings_shafts_and_service_cut_outs_as_per_drawings'),
  (18, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Beam reinforcement cutting and bending', 'beam_reinforcement_cutting_and_bending'),
  (19, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Beam bottom reinforcement fixing', 'beam_bottom_reinforcement_fixing'),
  (20, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Beam top reinforcement and extra bars fixing', 'beam_top_reinforcement_and_extra_bars_fixing'),
  (21, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Beam stirrups / links installation', 'beam_stirrups_links_installation'),
  (22, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Slab bottom reinforcement fixing', 'slab_bottom_reinforcement_fixing'),
  (23, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Slab top reinforcement and negative bars fixing', 'slab_top_reinforcement_and_negative_bars_fixing'),
  (24, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Distribution reinforcement and additional bars installation', 'distribution_reinforcement_and_additional_bars_installation'),
  (25, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Chair bars / spacers installation', 'chair_bars_spacers_installation'),
  (26, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Cover blocks placement and reinforcement cover checks', 'cover_blocks_placement_and_reinforcement_cover_checks'),
  (27, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Lapping, anchorage and development-length checks', 'lapping_anchorage_and_development_length_checks'),
  (28, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Reinforcement inspection against structural drawings', 'reinforcement_inspection_against_structural_drawings'),
  (29, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Electrical conduits embedded in slab, as per drawings', 'electrical_conduits_embedded_in_slab_as_per_drawings'),
  (30, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Electrical junction boxes and outlet provisions', 'electrical_junction_boxes_and_outlet_provisions'),
  (31, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Sleeves for plumbing and drainage pipes', 'sleeves_for_plumbing_and_drainage_pipes'),
  (32, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Openings for vertical service risers and MEP shafts', 'openings_for_vertical_service_risers_and_mep_shafts'),
  (33, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'AC, fire-fighting and other service provisions, where applicable', 'ac_fire_fighting_and_other_service_provisions_where_applicable'),
  (34, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Checking conduits and sleeves for clashes with reinforcement', 'checking_conduits_and_sleeves_for_clashes_with_reinforcement'),
  (35, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Verifying all service openings against coordinated MEP drawings', 'verifying_all_service_openings_against_coordinated_mep_drawings'),
  (36, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'MEP inspection and approval before concreting', 'mep_inspection_and_approval_before_concreting'),
  (37, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Balcony and slab-edge shuttering installation', 'balcony_and_slab_edge_shuttering_installation'),
  (38, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Edge protection and safe access arrangements', 'edge_protection_and_safe_access_arrangements'),
  (39, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Parapet / upstand / sunken-area provisions, where applicable', 'parapet_upstand_sunken_area_provisions_where_applicable'),
  (40, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Checking slab thickness and beam dimensions', 'checking_slab_thickness_and_beam_dimensions'),
  (41, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Checking slab levels, slopes and drop panels, where specified', 'checking_slab_levels_slopes_and_drop_panels_where_specified'),
  (42, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Removing loose binding wire, debris and standing water', 'removing_loose_binding_wire_debris_and_standing_water'),
  (43, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Checking reinforcement cleanliness and stability', 'checking_reinforcement_cleanliness_and_stability'),
  (44, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Final formwork and staging inspection', 'final_formwork_and_staging_inspection'),
  (45, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Structural engineer''s reinforcement inspection', 'structural_engineer_s_reinforcement_inspection'),
  (46, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'MEP coordination and inspection sign-off', 'mep_coordination_and_inspection_sign_off'),
  (47, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Formwork, staging and access safety clearance', 'formwork_staging_and_access_safety_clearance'),
  (48, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Concrete grade and approved mix confirmation', 'concrete_grade_and_approved_mix_confirmation'),
  (49, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Concrete quantity and supply schedule confirmation', 'concrete_quantity_and_supply_schedule_confirmation'),
  (50, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Pump, vibrator and backup equipment readiness', 'pump_vibrator_and_backup_equipment_readiness'),
  (51, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Manpower and concrete placement sequence confirmation', 'manpower_and_concrete_placement_sequence_confirmation'),
  (52, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Pre-pour checklist approval', 'pre_pour_checklist_approval'),
  (53, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Slab concreting', 'slab_concreting'),
  (54, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Concrete compaction, finishing and level checks', 'concrete_compaction_finishing_and_level_checks'),
  (55, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Curing initiation as specified', 'curing_initiation_as_specified'),
  (56, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Recording concrete pour details and inspection photographs', 'recording_concrete_pour_details_and_inspection_photographs')
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key)
WHERE t.key = 'pre_slab_v1'
ON CONFLICT (template_id, step_number) DO UPDATE SET step_key = EXCLUDED.step_key;

-- Post-Slab (conventional) (56 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track)
VALUES ('post_slab_v1', 'Post-Slab (conventional)', 1, TRUE, 'conventional', 'post_slab')
ON CONFLICT (key) DO UPDATE SET method = EXCLUDED.method, track = EXCLUDED.track;
INSERT INTO public.progression_template_steps (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Slab completion and preparation', 'Structural stage', 'Slab concreting completed', 'slab_concreting_completed'),
  (2, 1, 'Slab completion and preparation', 'Structural stage', 'Concrete curing', 'concrete_curing'),
  (3, 1, 'Slab completion and preparation', 'Structural stage', 'De-shuttering and removal of slab formwork as permitted by the engineer', 'de_shuttering_and_removal_of_slab_formwork_as_permitted_by_the_engineer'),
  (4, 1, 'Slab completion and preparation', 'Structural stage', 'Removal of debris and cleaning of the floor', 'removal_of_debris_and_cleaning_of_the_floor'),
  (5, 1, 'Slab completion and preparation', 'Structural stage', 'Structural inspection and checking slab levels', 'structural_inspection_and_checking_slab_levels'),
  (6, 1, 'Slab completion and preparation', 'Structural stage', 'Marking of walls, room layouts, shafts and openings', 'marking_of_walls_room_layouts_shafts_and_openings'),
  (7, 2, 'Blockwork and masonry', 'Wall construction stage', 'Blockwork / AAC blockwork / brickwork', 'blockwork_aac_blockwork_brickwork'),
  (8, 2, 'Blockwork and masonry', 'Wall construction stage', 'Internal partition walls and external infill walls', 'internal_partition_walls_and_external_infill_walls'),
  (9, 2, 'Blockwork and masonry', 'Wall construction stage', 'Door and window openings, lintels and sill-level provisions', 'door_and_window_openings_lintels_and_sill_level_provisions'),
  (10, 2, 'Blockwork and masonry', 'Wall construction stage', 'Doorframe installation and alignment, where frames are embedded during masonry', 'doorframe_installation_and_alignment_where_frames_are_embedded_during_masonry'),
  (11, 2, 'Blockwork and masonry', 'Wall construction stage', 'Wall chasing and openings for electrical and plumbing services, coordinated with masonry', 'wall_chasing_and_openings_for_electrical_and_plumbing_services_coordinated_with_masonry'),
  (12, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'Electrical conduit installation in walls and slabs, as applicable', 'electrical_conduit_installation_in_walls_and_slabs_as_applicable'),
  (13, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'Switchboard boxes and electrical junction boxes', 'switchboard_boxes_and_electrical_junction_boxes'),
  (14, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'Concealed plumbing water-supply lines', 'concealed_plumbing_water_supply_lines'),
  (15, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'Soil, waste and drainage pipes, including bathroom and kitchen connections', 'soil_waste_and_drainage_pipes_including_bathroom_and_kitchen_connections'),
  (16, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'AC refrigerant piping, drain lines and other concealed services, if applicable', 'ac_refrigerant_piping_drain_lines_and_other_concealed_services_if_applicable'),
  (17, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'Electrical continuity checks and plumbing pressure/leak tests before covering', 'electrical_continuity_checks_and_plumbing_pressure_leak_tests_before_covering'),
  (18, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Window sill installation — granite patti / stone sill', 'window_sill_installation_granite_patti_stone_sill'),
  (19, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Doorframe fixing and final alignment, if not already completed', 'doorframe_fixing_and_final_alignment_if_not_already_completed'),
  (20, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Electrical and plumbing chase filling', 'electrical_and_plumbing_chase_filling'),
  (21, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Chicken mesh / fibre mesh at masonry-to-RCC junctions, where specified', 'chicken_mesh_fibre_mesh_at_masonry_to_rcc_junctions_where_specified'),
  (22, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Internal wall plaster', 'internal_wall_plaster'),
  (23, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'External wall plaster and façade base preparation', 'external_wall_plaster_and_fac_ade_base_preparation'),
  (24, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Plaster curing and surface-level checks', 'plaster_curing_and_surface_level_checks'),
  (25, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Bathroom and toilet floor-level preparation and slope formation', 'bathroom_and_toilet_floor_level_preparation_and_slope_formation'),
  (26, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Waterproofing in toilets, bathrooms, balconies and other specified areas', 'waterproofing_in_toilets_bathrooms_balconies_and_other_specified_areas'),
  (27, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Waterproofing upturns and pipe-junction treatment', 'waterproofing_upturns_and_pipe_junction_treatment'),
  (28, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Water ponding test and rectification, where applicable', 'water_ponding_test_and_rectification_where_applicable'),
  (29, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Kitchen platform and plumbing point coordination', 'kitchen_platform_and_plumbing_point_coordination'),
  (30, 6, 'Flooring and stonework', 'Floor finishes', 'Floor base preparation and level marking', 'floor_base_preparation_and_level_marking'),
  (31, 6, 'Flooring and stonework', 'Floor finishes', 'Bathroom and toilet floor tiles with correct slope', 'bathroom_and_toilet_floor_tiles_with_correct_slope'),
  (32, 6, 'Flooring and stonework', 'Floor finishes', 'Bathroom wall tiles', 'bathroom_wall_tiles'),
  (33, 6, 'Flooring and stonework', 'Floor finishes', 'Kitchen dado tiles, where specified', 'kitchen_dado_tiles_where_specified'),
  (34, 6, 'Flooring and stonework', 'Floor finishes', 'Room flooring — tiles, marble or other specified material', 'room_flooring_tiles_marble_or_other_specified_material'),
  (35, 6, 'Flooring and stonework', 'Floor finishes', 'Door thresholds / granite patti', 'door_thresholds_granite_patti'),
  (36, 6, 'Flooring and stonework', 'Floor finishes', 'Skirting and tile grouting', 'skirting_and_tile_grouting'),
  (37, 6, 'Flooring and stonework', 'Floor finishes', 'Staircase stonework and common-area flooring, as applicable', 'staircase_stonework_and_common_area_flooring_as_applicable'),
  (38, 7, 'Windows, façade and painting', 'Façade & paint', 'Window frame and shutter installation', 'window_frame_and_shutter_installation'),
  (39, 7, 'Windows, façade and painting', 'Façade & paint', 'External façade works, including plaster finishes, texture or cladding', 'external_fac_ade_works_including_plaster_finishes_texture_or_cladding'),
  (40, 7, 'Windows, façade and painting', 'Façade & paint', 'Internal wall putty and surface preparation', 'internal_wall_putty_and_surface_preparation'),
  (41, 7, 'Windows, façade and painting', 'Façade & paint', 'Primer application', 'primer_application'),
  (42, 7, 'Windows, façade and painting', 'Façade & paint', 'First coat of paint', 'first_coat_of_paint'),
  (43, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Door shutters, hardware and locks', 'door_shutters_hardware_and_locks'),
  (44, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Electrical wires, switches, sockets and distribution board connections', 'electrical_wires_switches_sockets_and_distribution_board_connections'),
  (45, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Sanitaryware, WC, washbasin and bathroom fittings', 'sanitaryware_wc_washbasin_and_bathroom_fittings'),
  (46, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Plumbing taps, mixers and accessories', 'plumbing_taps_mixers_and_accessories'),
  (47, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Kitchen platform, sink and related fittings', 'kitchen_platform_sink_and_related_fittings'),
  (48, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'False ceiling and light fixtures, where specified', 'false_ceiling_and_light_fixtures_where_specified'),
  (49, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'AC indoor units and other MEP equipment, where applicable', 'ac_indoor_units_and_other_mep_equipment_where_applicable'),
  (50, 9, 'Final finishing and handover', 'Handover', 'Final paint coat and touch-ups', 'final_paint_coat_and_touch_ups'),
  (51, 9, 'Final finishing and handover', 'Handover', 'Sealant application and finishing corrections', 'sealant_application_and_finishing_corrections'),
  (52, 9, 'Final finishing and handover', 'Handover', 'Electrical testing and functional checks', 'electrical_testing_and_functional_checks'),
  (53, 9, 'Final finishing and handover', 'Handover', 'Plumbing leak checks and drainage-flow testing', 'plumbing_leak_checks_and_drainage_flow_testing'),
  (54, 9, 'Final finishing and handover', 'Handover', 'Door, window and hardware operation checks', 'door_window_and_hardware_operation_checks'),
  (55, 9, 'Final finishing and handover', 'Handover', 'Snagging inspection and defect rectification', 'snagging_inspection_and_defect_rectification'),
  (56, 9, 'Final finishing and handover', 'Handover', 'Deep cleaning and final handover', 'deep_cleaning_and_final_handover')
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key)
WHERE t.key = 'post_slab_v1'
ON CONFLICT (template_id, step_number) DO UPDATE SET step_key = EXCLUDED.step_key;

-- Structure cycle (Mivan) (27 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track)
VALUES ('pre_slab_mivan_v1', 'Structure cycle (Mivan)', 1, TRUE, 'mivan', 'pre_slab')
ON CONFLICT (key) DO UPDATE SET method = EXCLUDED.method, track = EXCLUDED.track;
INSERT INTO public.progression_template_steps (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Setting out and de-shuttering', 'Cycle start', 'De-shuttering of previous floor wall and slab panels, props retained as permitted by the engineer', 'de_shuttering_of_previous_floor_wall_and_slab_panels_props_retained_as_permitted_by_the_engineer'),
  (2, 1, 'Setting out and de-shuttering', 'Cycle start', 'Panel cleaning and release-agent application', 'panel_cleaning_and_release_agent_application'),
  (3, 1, 'Setting out and de-shuttering', 'Cycle start', 'Surveying and marking grid lines, walls and openings', 'surveying_and_marking_grid_lines_walls_and_openings'),
  (4, 1, 'Setting out and de-shuttering', 'Cycle start', 'Kicker, starter and level checks', 'kicker_starter_and_level_checks'),
  (5, 2, 'Wall reinforcement', 'Reinforcement stage', 'Reinforcement fixing for walls and columns', 'reinforcement_fixing_for_walls_and_columns'),
  (6, 2, 'Wall reinforcement', 'Reinforcement stage', 'Trimmer bars and reinforcement around openings', 'trimmer_bars_and_reinforcement_around_openings'),
  (7, 2, 'Wall reinforcement', 'Reinforcement stage', 'Cover blocks on wall reinforcement', 'cover_blocks_on_wall_reinforcement'),
  (8, 3, 'MEP built into walls', 'Pre-pour MEP provisions', 'Electrical conduits, switch and junction boxes fixed in walls', 'electrical_conduits_switch_and_junction_boxes_fixed_in_walls'),
  (9, 3, 'MEP built into walls', 'Pre-pour MEP provisions', 'Plumbing sleeves and concealed pipes in walls, as applicable', 'plumbing_sleeves_and_concealed_pipes_in_walls_as_applicable'),
  (10, 3, 'MEP built into walls', 'Pre-pour MEP provisions', 'Door and window opening boxes and block-outs', 'door_and_window_opening_boxes_and_block_outs'),
  (11, 3, 'MEP built into walls', 'Pre-pour MEP provisions', 'In-wall MEP check before closing the formwork', 'in_wall_mep_check_before_closing_the_formwork'),
  (12, 4, 'Aluminium formwork erection', 'Formwork stage', 'Aluminium wall panels for walls, both faces, with pins, wedges and ties', 'aluminium_wall_panels_for_walls_both_faces_with_pins_wedges_and_ties'),
  (13, 4, 'Aluminium formwork erection', 'Formwork stage', 'Beam soffit and slab deck panels with props', 'beam_soffit_and_slab_deck_panels_with_props'),
  (14, 4, 'Aluminium formwork erection', 'Formwork stage', 'Providing slab openings, shafts and service cut-outs as per drawings', 'providing_slab_openings_shafts_and_service_cut_outs_as_per_drawings'),
  (15, 4, 'Aluminium formwork erection', 'Formwork stage', 'Formwork line, level, plumb and diagonal checks', 'formwork_line_level_plumb_and_diagonal_checks'),
  (16, 4, 'Aluminium formwork erection', 'Formwork stage', 'Edge panels, brackets and working platform', 'edge_panels_brackets_and_working_platform'),
  (17, 5, 'Slab reinforcement and MEP', 'Reinforcement stage', 'Slab bottom reinforcement fixing', 'slab_bottom_reinforcement_fixing'),
  (18, 5, 'Slab reinforcement and MEP', 'Reinforcement stage', 'Slab top reinforcement and negative bars fixing', 'slab_top_reinforcement_and_negative_bars_fixing'),
  (19, 5, 'Slab reinforcement and MEP', 'Reinforcement stage', 'Electrical conduits embedded in slab, as per drawings', 'electrical_conduits_embedded_in_slab_as_per_drawings'),
  (20, 5, 'Slab reinforcement and MEP', 'Reinforcement stage', 'Sleeves for plumbing and drainage pipes', 'sleeves_for_plumbing_and_drainage_pipes'),
  (21, 5, 'Slab reinforcement and MEP', 'Reinforcement stage', 'Chair bars / spacers installation', 'chair_bars_spacers_installation'),
  (22, 6, 'Inspection and monolithic pour', 'Casting stage', 'Formwork, reinforcement and MEP inspection before the pour', 'formwork_reinforcement_and_mep_inspection_before_the_pour'),
  (23, 6, 'Inspection and monolithic pour', 'Casting stage', 'Concrete grade and approved mix confirmation', 'concrete_grade_and_approved_mix_confirmation'),
  (24, 6, 'Inspection and monolithic pour', 'Casting stage', 'Walls and slab poured together', 'walls_and_slab_poured_together'),
  (25, 6, 'Inspection and monolithic pour', 'Casting stage', 'Concrete compaction, finishing and level checks', 'concrete_compaction_finishing_and_level_checks'),
  (26, 6, 'Inspection and monolithic pour', 'Casting stage', 'Cube samples taken', 'cube_samples_taken'),
  (27, 6, 'Inspection and monolithic pour', 'Casting stage', 'Curing initiation as specified', 'curing_initiation_as_specified')
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key)
WHERE t.key = 'pre_slab_mivan_v1'
ON CONFLICT (template_id, step_number) DO UPDATE SET step_key = EXCLUDED.step_key;

-- Finishing (Mivan) (45 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track)
VALUES ('post_slab_mivan_v1', 'Finishing (Mivan)', 1, TRUE, 'mivan', 'post_slab')
ON CONFLICT (key) DO UPDATE SET method = EXCLUDED.method, track = EXCLUDED.track;
INSERT INTO public.progression_template_steps (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key
FROM public.progression_templates t,
(VALUES
  (1, 1, 'After the pour', 'Surface preparation', 'Fin and honeycomb removal and surface repair', 'fin_and_honeycomb_removal_and_surface_repair'),
  (2, 1, 'After the pour', 'Surface preparation', 'Tie-hole filling', 'tie_hole_filling'),
  (3, 1, 'After the pour', 'Surface preparation', 'Slab level and wall plumb survey', 'slab_level_and_wall_plumb_survey'),
  (4, 1, 'After the pour', 'Surface preparation', 'Prop removal once the slab reaches strength', 'prop_removal_once_the_slab_reaches_strength'),
  (5, 2, 'Openings and frames', 'Openings', 'Doorframe fixing in cast openings', 'doorframe_fixing_in_cast_openings'),
  (6, 2, 'Openings and frames', 'Openings', 'Window frames or sub-frames in cast openings', 'window_frames_or_sub_frames_in_cast_openings'),
  (7, 2, 'Openings and frames', 'Openings', 'Window sill installation — granite patti / stone sill', 'window_sill_installation_granite_patti_stone_sill'),
  (8, 3, 'Services first fix (balance)', 'First-fix MEP works', 'Plumbing risers and shaft piping', 'plumbing_risers_and_shaft_piping'),
  (9, 3, 'Services first fix (balance)', 'First-fix MEP works', 'Soil, waste and drainage pipes, including bathroom and kitchen connections', 'soil_waste_and_drainage_pipes_including_bathroom_and_kitchen_connections'),
  (10, 3, 'Services first fix (balance)', 'First-fix MEP works', 'Wiring pulled through embedded conduits', 'wiring_pulled_through_embedded_conduits'),
  (11, 3, 'Services first fix (balance)', 'First-fix MEP works', 'Electrical continuity checks and plumbing pressure/leak tests before covering', 'electrical_continuity_checks_and_plumbing_pressure_leak_tests_before_covering'),
  (12, 4, 'Waterproofing and wet-area preparation', 'Wet areas', 'Bathroom and toilet floor-level preparation and slope formation', 'bathroom_and_toilet_floor_level_preparation_and_slope_formation'),
  (13, 4, 'Waterproofing and wet-area preparation', 'Wet areas', 'Waterproofing in toilets, bathrooms, balconies and other specified areas', 'waterproofing_in_toilets_bathrooms_balconies_and_other_specified_areas'),
  (14, 4, 'Waterproofing and wet-area preparation', 'Wet areas', 'Waterproofing upturns and pipe-junction treatment', 'waterproofing_upturns_and_pipe_junction_treatment'),
  (15, 4, 'Waterproofing and wet-area preparation', 'Wet areas', 'Water ponding test and rectification, where applicable', 'water_ponding_test_and_rectification_where_applicable'),
  (16, 4, 'Waterproofing and wet-area preparation', 'Wet areas', 'Kitchen platform and plumbing point coordination', 'kitchen_platform_and_plumbing_point_coordination'),
  (17, 5, 'Wall finish (no plaster)', 'Wall finishing', 'Gypsum punning / skim coat on walls and ceilings', 'gypsum_punning_skim_coat_on_walls_and_ceilings'),
  (18, 5, 'Wall finish (no plaster)', 'Wall finishing', 'Internal wall putty and surface preparation', 'internal_wall_putty_and_surface_preparation'),
  (19, 5, 'Wall finish (no plaster)', 'Wall finishing', 'External texture base on RCC walls (no plaster)', 'external_texture_base_on_rcc_walls_no_plaster'),
  (20, 6, 'Flooring and stonework', 'Floor finishes', 'Floor base preparation and level marking', 'floor_base_preparation_and_level_marking'),
  (21, 6, 'Flooring and stonework', 'Floor finishes', 'Bathroom and toilet floor tiles with correct slope', 'bathroom_and_toilet_floor_tiles_with_correct_slope'),
  (22, 6, 'Flooring and stonework', 'Floor finishes', 'Bathroom wall tiles', 'bathroom_wall_tiles'),
  (23, 6, 'Flooring and stonework', 'Floor finishes', 'Kitchen dado tiles, where specified', 'kitchen_dado_tiles_where_specified'),
  (24, 6, 'Flooring and stonework', 'Floor finishes', 'Room flooring — tiles, marble or other specified material', 'room_flooring_tiles_marble_or_other_specified_material'),
  (25, 6, 'Flooring and stonework', 'Floor finishes', 'Door thresholds / granite patti', 'door_thresholds_granite_patti'),
  (26, 6, 'Flooring and stonework', 'Floor finishes', 'Skirting and tile grouting', 'skirting_and_tile_grouting'),
  (27, 6, 'Flooring and stonework', 'Floor finishes', 'Staircase stonework and common-area flooring, as applicable', 'staircase_stonework_and_common_area_flooring_as_applicable'),
  (28, 7, 'Windows, façade and painting', 'Façade & paint', 'Window frame and shutter installation', 'window_frame_and_shutter_installation'),
  (29, 7, 'Windows, façade and painting', 'Façade & paint', 'External texture paint', 'external_texture_paint'),
  (30, 7, 'Windows, façade and painting', 'Façade & paint', 'Primer application', 'primer_application'),
  (31, 7, 'Windows, façade and painting', 'Façade & paint', 'First coat of paint', 'first_coat_of_paint'),
  (32, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Door shutters, hardware and locks', 'door_shutters_hardware_and_locks'),
  (33, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Electrical wires, switches, sockets and distribution board connections', 'electrical_wires_switches_sockets_and_distribution_board_connections'),
  (34, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Sanitaryware, WC, washbasin and bathroom fittings', 'sanitaryware_wc_washbasin_and_bathroom_fittings'),
  (35, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Plumbing taps, mixers and accessories', 'plumbing_taps_mixers_and_accessories'),
  (36, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Kitchen platform, sink and related fittings', 'kitchen_platform_sink_and_related_fittings'),
  (37, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'False ceiling and light fixtures, where specified', 'false_ceiling_and_light_fixtures_where_specified'),
  (38, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'AC indoor units and other MEP equipment, where applicable', 'ac_indoor_units_and_other_mep_equipment_where_applicable'),
  (39, 9, 'Final finishing and handover', 'Handover', 'Final paint coat and touch-ups', 'final_paint_coat_and_touch_ups'),
  (40, 9, 'Final finishing and handover', 'Handover', 'Sealant application and finishing corrections', 'sealant_application_and_finishing_corrections'),
  (41, 9, 'Final finishing and handover', 'Handover', 'Electrical testing and functional checks', 'electrical_testing_and_functional_checks'),
  (42, 9, 'Final finishing and handover', 'Handover', 'Plumbing leak checks and drainage-flow testing', 'plumbing_leak_checks_and_drainage_flow_testing'),
  (43, 9, 'Final finishing and handover', 'Handover', 'Door, window and hardware operation checks', 'door_window_and_hardware_operation_checks'),
  (44, 9, 'Final finishing and handover', 'Handover', 'Snagging inspection and defect rectification', 'snagging_inspection_and_defect_rectification'),
  (45, 9, 'Final finishing and handover', 'Handover', 'Deep cleaning and final handover', 'deep_cleaning_and_final_handover')
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key)
WHERE t.key = 'post_slab_mivan_v1'
ON CONFLICT (template_id, step_number) DO UPDATE SET step_key = EXCLUDED.step_key;

-- Structure cycle (Hybrid) (27 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track)
VALUES ('pre_slab_hybrid_v1', 'Structure cycle (Hybrid)', 1, TRUE, 'hybrid', 'pre_slab')
ON CONFLICT (key) DO UPDATE SET method = EXCLUDED.method, track = EXCLUDED.track;
INSERT INTO public.progression_template_steps (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Setting out and de-shuttering', 'Cycle start', 'De-shuttering of previous floor wall and slab panels, props retained as permitted by the engineer', 'de_shuttering_of_previous_floor_wall_and_slab_panels_props_retained_as_permitted_by_the_engineer'),
  (2, 1, 'Setting out and de-shuttering', 'Cycle start', 'Panel cleaning and release-agent application', 'panel_cleaning_and_release_agent_application'),
  (3, 1, 'Setting out and de-shuttering', 'Cycle start', 'Surveying and marking grid lines, walls and openings', 'surveying_and_marking_grid_lines_walls_and_openings'),
  (4, 1, 'Setting out and de-shuttering', 'Cycle start', 'Kicker, starter and level checks', 'kicker_starter_and_level_checks'),
  (5, 2, 'Wall reinforcement', 'Reinforcement stage', 'Reinforcement fixing for outer and shear walls and columns', 'reinforcement_fixing_for_outer_and_shear_walls_and_columns'),
  (6, 2, 'Wall reinforcement', 'Reinforcement stage', 'Trimmer bars and reinforcement around openings', 'trimmer_bars_and_reinforcement_around_openings'),
  (7, 2, 'Wall reinforcement', 'Reinforcement stage', 'Cover blocks on wall reinforcement', 'cover_blocks_on_wall_reinforcement'),
  (8, 3, 'MEP built into walls', 'Pre-pour MEP provisions', 'Electrical conduits, switch and junction boxes fixed in outer and shear walls', 'electrical_conduits_switch_and_junction_boxes_fixed_in_outer_and_shear_walls'),
  (9, 3, 'MEP built into walls', 'Pre-pour MEP provisions', 'Plumbing sleeves and concealed pipes in outer and shear walls, as applicable', 'plumbing_sleeves_and_concealed_pipes_in_outer_and_shear_walls_as_applicable'),
  (10, 3, 'MEP built into walls', 'Pre-pour MEP provisions', 'Door and window opening boxes and block-outs', 'door_and_window_opening_boxes_and_block_outs'),
  (11, 3, 'MEP built into walls', 'Pre-pour MEP provisions', 'In-wall MEP check before closing the formwork', 'in_wall_mep_check_before_closing_the_formwork'),
  (12, 4, 'Aluminium formwork erection', 'Formwork stage', 'Aluminium wall panels for outer and shear walls, both faces, with pins, wedges and ties', 'aluminium_wall_panels_for_outer_and_shear_walls_both_faces_with_pins_wedges_and_ties'),
  (13, 4, 'Aluminium formwork erection', 'Formwork stage', 'Beam soffit and slab deck panels with props', 'beam_soffit_and_slab_deck_panels_with_props'),
  (14, 4, 'Aluminium formwork erection', 'Formwork stage', 'Providing slab openings, shafts and service cut-outs as per drawings', 'providing_slab_openings_shafts_and_service_cut_outs_as_per_drawings'),
  (15, 4, 'Aluminium formwork erection', 'Formwork stage', 'Formwork line, level, plumb and diagonal checks', 'formwork_line_level_plumb_and_diagonal_checks'),
  (16, 4, 'Aluminium formwork erection', 'Formwork stage', 'Edge panels, brackets and working platform', 'edge_panels_brackets_and_working_platform'),
  (17, 5, 'Slab reinforcement and MEP', 'Reinforcement stage', 'Slab bottom reinforcement fixing', 'slab_bottom_reinforcement_fixing'),
  (18, 5, 'Slab reinforcement and MEP', 'Reinforcement stage', 'Slab top reinforcement and negative bars fixing', 'slab_top_reinforcement_and_negative_bars_fixing'),
  (19, 5, 'Slab reinforcement and MEP', 'Reinforcement stage', 'Electrical conduits embedded in slab, as per drawings', 'electrical_conduits_embedded_in_slab_as_per_drawings'),
  (20, 5, 'Slab reinforcement and MEP', 'Reinforcement stage', 'Sleeves for plumbing and drainage pipes', 'sleeves_for_plumbing_and_drainage_pipes'),
  (21, 5, 'Slab reinforcement and MEP', 'Reinforcement stage', 'Chair bars / spacers installation', 'chair_bars_spacers_installation'),
  (22, 6, 'Inspection and monolithic pour', 'Casting stage', 'Formwork, reinforcement and MEP inspection before the pour', 'formwork_reinforcement_and_mep_inspection_before_the_pour'),
  (23, 6, 'Inspection and monolithic pour', 'Casting stage', 'Concrete grade and approved mix confirmation', 'concrete_grade_and_approved_mix_confirmation'),
  (24, 6, 'Inspection and monolithic pour', 'Casting stage', 'Walls and slab poured together', 'walls_and_slab_poured_together'),
  (25, 6, 'Inspection and monolithic pour', 'Casting stage', 'Concrete compaction, finishing and level checks', 'concrete_compaction_finishing_and_level_checks'),
  (26, 6, 'Inspection and monolithic pour', 'Casting stage', 'Cube samples taken', 'cube_samples_taken'),
  (27, 6, 'Inspection and monolithic pour', 'Casting stage', 'Curing initiation as specified', 'curing_initiation_as_specified')
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key)
WHERE t.key = 'pre_slab_hybrid_v1'
ON CONFLICT (template_id, step_number) DO UPDATE SET step_key = EXCLUDED.step_key;

-- Finishing (Hybrid) (52 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track)
VALUES ('post_slab_hybrid_v1', 'Finishing (Hybrid)', 1, TRUE, 'hybrid', 'post_slab')
ON CONFLICT (key) DO UPDATE SET method = EXCLUDED.method, track = EXCLUDED.track;
INSERT INTO public.progression_template_steps (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key
FROM public.progression_templates t,
(VALUES
  (1, 1, 'After the pour', 'Surface preparation', 'Fin and honeycomb removal and surface repair', 'fin_and_honeycomb_removal_and_surface_repair'),
  (2, 1, 'After the pour', 'Surface preparation', 'Tie-hole filling', 'tie_hole_filling'),
  (3, 1, 'After the pour', 'Surface preparation', 'Slab level and wall plumb survey', 'slab_level_and_wall_plumb_survey'),
  (4, 1, 'After the pour', 'Surface preparation', 'Prop removal once the slab reaches strength', 'prop_removal_once_the_slab_reaches_strength'),
  (5, 2, 'Internal partitions', 'Wall construction stage', 'Blockwork / AAC partitions for internal walls', 'blockwork_aac_partitions_for_internal_walls'),
  (6, 2, 'Internal partitions', 'Wall construction stage', 'Lintels and door openings in block walls', 'lintels_and_door_openings_in_block_walls'),
  (7, 2, 'Internal partitions', 'Wall construction stage', 'Wall chasing for services in block walls only', 'wall_chasing_for_services_in_block_walls_only'),
  (8, 2, 'Internal partitions', 'Wall construction stage', 'Electrical and plumbing chase filling', 'electrical_and_plumbing_chase_filling'),
  (9, 2, 'Internal partitions', 'Wall construction stage', 'Chicken mesh / fibre mesh at masonry-to-RCC junctions, where specified', 'chicken_mesh_fibre_mesh_at_masonry_to_rcc_junctions_where_specified'),
  (10, 2, 'Internal partitions', 'Wall construction stage', 'Internal plaster on block walls', 'internal_plaster_on_block_walls'),
  (11, 2, 'Internal partitions', 'Wall construction stage', 'Plaster curing and surface-level checks', 'plaster_curing_and_surface_level_checks'),
  (12, 3, 'Openings and frames', 'Openings', 'Doorframe fixing in cast openings', 'doorframe_fixing_in_cast_openings'),
  (13, 3, 'Openings and frames', 'Openings', 'Window frames or sub-frames in cast openings', 'window_frames_or_sub_frames_in_cast_openings'),
  (14, 3, 'Openings and frames', 'Openings', 'Window sill installation — granite patti / stone sill', 'window_sill_installation_granite_patti_stone_sill'),
  (15, 4, 'Services first fix (balance)', 'First-fix MEP works', 'Plumbing risers and shaft piping', 'plumbing_risers_and_shaft_piping'),
  (16, 4, 'Services first fix (balance)', 'First-fix MEP works', 'Soil, waste and drainage pipes, including bathroom and kitchen connections', 'soil_waste_and_drainage_pipes_including_bathroom_and_kitchen_connections'),
  (17, 4, 'Services first fix (balance)', 'First-fix MEP works', 'Wiring pulled through embedded conduits', 'wiring_pulled_through_embedded_conduits'),
  (18, 4, 'Services first fix (balance)', 'First-fix MEP works', 'Electrical continuity checks and plumbing pressure/leak tests before covering', 'electrical_continuity_checks_and_plumbing_pressure_leak_tests_before_covering'),
  (19, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Bathroom and toilet floor-level preparation and slope formation', 'bathroom_and_toilet_floor_level_preparation_and_slope_formation'),
  (20, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Waterproofing in toilets, bathrooms, balconies and other specified areas', 'waterproofing_in_toilets_bathrooms_balconies_and_other_specified_areas'),
  (21, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Waterproofing upturns and pipe-junction treatment', 'waterproofing_upturns_and_pipe_junction_treatment'),
  (22, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Water ponding test and rectification, where applicable', 'water_ponding_test_and_rectification_where_applicable'),
  (23, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Kitchen platform and plumbing point coordination', 'kitchen_platform_and_plumbing_point_coordination'),
  (24, 6, 'Wall finish', 'Wall finishing', 'Gypsum punning / skim coat on RCC walls', 'gypsum_punning_skim_coat_on_rcc_walls'),
  (25, 6, 'Wall finish', 'Wall finishing', 'Internal wall putty and surface preparation', 'internal_wall_putty_and_surface_preparation'),
  (26, 6, 'Wall finish', 'Wall finishing', 'External texture base on RCC walls (no plaster)', 'external_texture_base_on_rcc_walls_no_plaster'),
  (27, 7, 'Flooring and stonework', 'Floor finishes', 'Floor base preparation and level marking', 'floor_base_preparation_and_level_marking'),
  (28, 7, 'Flooring and stonework', 'Floor finishes', 'Bathroom and toilet floor tiles with correct slope', 'bathroom_and_toilet_floor_tiles_with_correct_slope'),
  (29, 7, 'Flooring and stonework', 'Floor finishes', 'Bathroom wall tiles', 'bathroom_wall_tiles'),
  (30, 7, 'Flooring and stonework', 'Floor finishes', 'Kitchen dado tiles, where specified', 'kitchen_dado_tiles_where_specified'),
  (31, 7, 'Flooring and stonework', 'Floor finishes', 'Room flooring — tiles, marble or other specified material', 'room_flooring_tiles_marble_or_other_specified_material'),
  (32, 7, 'Flooring and stonework', 'Floor finishes', 'Door thresholds / granite patti', 'door_thresholds_granite_patti'),
  (33, 7, 'Flooring and stonework', 'Floor finishes', 'Skirting and tile grouting', 'skirting_and_tile_grouting'),
  (34, 7, 'Flooring and stonework', 'Floor finishes', 'Staircase stonework and common-area flooring, as applicable', 'staircase_stonework_and_common_area_flooring_as_applicable'),
  (35, 8, 'Windows, façade and painting', 'Façade & paint', 'Window frame and shutter installation', 'window_frame_and_shutter_installation'),
  (36, 8, 'Windows, façade and painting', 'Façade & paint', 'External texture paint', 'external_texture_paint'),
  (37, 8, 'Windows, façade and painting', 'Façade & paint', 'Primer application', 'primer_application'),
  (38, 8, 'Windows, façade and painting', 'Façade & paint', 'First coat of paint', 'first_coat_of_paint'),
  (39, 9, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Door shutters, hardware and locks', 'door_shutters_hardware_and_locks'),
  (40, 9, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Electrical wires, switches, sockets and distribution board connections', 'electrical_wires_switches_sockets_and_distribution_board_connections'),
  (41, 9, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Sanitaryware, WC, washbasin and bathroom fittings', 'sanitaryware_wc_washbasin_and_bathroom_fittings'),
  (42, 9, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Plumbing taps, mixers and accessories', 'plumbing_taps_mixers_and_accessories'),
  (43, 9, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Kitchen platform, sink and related fittings', 'kitchen_platform_sink_and_related_fittings'),
  (44, 9, 'Fixtures and second-fix services', 'Fixtures & MEP', 'False ceiling and light fixtures, where specified', 'false_ceiling_and_light_fixtures_where_specified'),
  (45, 9, 'Fixtures and second-fix services', 'Fixtures & MEP', 'AC indoor units and other MEP equipment, where applicable', 'ac_indoor_units_and_other_mep_equipment_where_applicable'),
  (46, 10, 'Final finishing and handover', 'Handover', 'Final paint coat and touch-ups', 'final_paint_coat_and_touch_ups'),
  (47, 10, 'Final finishing and handover', 'Handover', 'Sealant application and finishing corrections', 'sealant_application_and_finishing_corrections'),
  (48, 10, 'Final finishing and handover', 'Handover', 'Electrical testing and functional checks', 'electrical_testing_and_functional_checks'),
  (49, 10, 'Final finishing and handover', 'Handover', 'Plumbing leak checks and drainage-flow testing', 'plumbing_leak_checks_and_drainage_flow_testing'),
  (50, 10, 'Final finishing and handover', 'Handover', 'Door, window and hardware operation checks', 'door_window_and_hardware_operation_checks'),
  (51, 10, 'Final finishing and handover', 'Handover', 'Snagging inspection and defect rectification', 'snagging_inspection_and_defect_rectification'),
  (52, 10, 'Final finishing and handover', 'Handover', 'Deep cleaning and final handover', 'deep_cleaning_and_final_handover')
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key)
WHERE t.key = 'post_slab_hybrid_v1'
ON CONFLICT (template_id, step_number) DO UPDATE SET step_key = EXCLUDED.step_key;

-- Default trades per method (zones)
INSERT INTO public.completion_activities (project_id, method, key, name, weight, sort_order)
SELECT NULL, 'mivan', v.key, v.name, v.weight, v.sort_order
FROM (VALUES
  ('services', 'Services (MEP)', 20, 1),
  ('wall_finish', 'Wall finish (skim / punning)', 15, 2),
  ('doors_windows', 'Doors & windows', 15, 3),
  ('flooring', 'Flooring', 25, 4),
  ('paint', 'Paint & texture', 25, 5)
) AS v(key, name, weight, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.completion_activities a
  WHERE a.project_id IS NULL AND a.method = 'mivan' AND a.key = v.key
);
INSERT INTO public.completion_activities (project_id, method, key, name, weight, sort_order)
SELECT NULL, 'hybrid', v.key, v.name, v.weight, v.sort_order
FROM (VALUES
  ('blockwork', 'Blockwork (internal)', 10, 1),
  ('services', 'Services (MEP)', 15, 2),
  ('plaster', 'Plaster (internal)', 10, 3),
  ('wall_finish', 'Wall finish (skim / punning)', 10, 4),
  ('doors_windows', 'Doors & windows', 10, 5),
  ('flooring', 'Flooring', 20, 6),
  ('paint', 'Paint & texture', 25, 7)
) AS v(key, name, weight, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.completion_activities a
  WHERE a.project_id IS NULL AND a.method = 'hybrid' AND a.key = v.key
);

NOTIFY pgrst, 'reload schema';

-- Check: templates and step counts per method.
SELECT t.key, t.method, t.track, COUNT(s.id) AS steps, COUNT(s.step_key) AS keyed
  FROM public.progression_templates t
  LEFT JOIN public.progression_template_steps s ON s.template_id = t.id
 GROUP BY t.key, t.method, t.track
 ORDER BY t.method, t.track;
