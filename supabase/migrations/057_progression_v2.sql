-- =============================================================================
-- 057 — Progression v2: Inside / Outside / Site lists, weighted phases
--
-- * Templates gain phase_weight, alias_keys (v1 steps a v2 step replaces),
--   photo_expected, hidden_at (project copies) and base_key / project_id.
-- * New tracks: 'external' (one checklist per building) and 'site' (one per
--   project). floor_id stays required for the per-floor tracks.
-- * projects.progression_version (1 = today's lists, 2 = v2) and
--   progress_split (Inside / Outside / Site weights, default 70/20/10).
-- * project_progression_steps.na: a step marked N/A on one floor.
-- * reconcile_progression_v2(project, actor): moves a project to v2 and keeps
--   it in sync (method changes, new floors/buildings, edited lists). Recorded
--   work carries over by step key or alias; old checklists are archived.
--
-- Template rows are generated from src/lib/progression/library-v2.ts by
-- scripts/generate-v2-templates.cjs. No project changes until it is moved.
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

ALTER TABLE public.progression_templates
  ADD COLUMN IF NOT EXISTS base_key TEXT,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.progression_template_steps
  ADD COLUMN IF NOT EXISTS phase_weight NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS alias_keys TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS photo_expected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS progression_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS progress_split JSONB NOT NULL DEFAULT '{"inside":70,"outside":20,"site":10}'::jsonb;

ALTER TABLE public.project_progression_steps
  ADD COLUMN IF NOT EXISTS na BOOLEAN NOT NULL DEFAULT FALSE;

-- Building-level (external) and project-level (site) checklists have no floor.
ALTER TABLE public.project_progressions ALTER COLUMN floor_id DROP NOT NULL;
ALTER TABLE public.project_progressions DROP CONSTRAINT IF EXISTS project_progressions_track_check;
ALTER TABLE public.project_progressions
  ADD CONSTRAINT project_progressions_track_check CHECK (track IN ('pre_slab', 'post_slab', 'external', 'site'));
ALTER TABLE public.project_progressions DROP CONSTRAINT IF EXISTS project_progressions_scope_check;
ALTER TABLE public.project_progressions
  ADD CONSTRAINT project_progressions_scope_check CHECK (
    (track IN ('pre_slab', 'post_slab') AND floor_id IS NOT NULL)
    OR (track = 'external' AND floor_id IS NULL AND building_id IS NOT NULL)
    OR (track = 'site' AND floor_id IS NULL)
  );
CREATE UNIQUE INDEX IF NOT EXISTS project_progressions_external_unique
  ON public.project_progressions (building_id) WHERE track = 'external' AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS project_progressions_site_unique
  ON public.project_progressions (project_id) WHERE track = 'site' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Generated v2 templates
-- ---------------------------------------------------------------------------
-- Structure (conventional) (13 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track, base_key)
VALUES ('pre_slab_v2', 'Structure (conventional)', 2, TRUE, 'conventional', 'pre_slab', 'pre_slab_v2')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, version = 2, method = EXCLUDED.method, track = EXCLUDED.track, base_key = EXCLUDED.base_key;
INSERT INTO public.progression_template_steps
  (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key, v.phase_weight, v.alias_keys, v.photo_expected
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Structure — slab cycle', 'Structure', 'Previous slab de-shuttering, as the engineer permits', 'previous_slab_de_shuttering_as_the_engineer_permits', 30, ARRAY['previous_slab_curing_and_de_shuttering_as_permitted_by_the_engineer', 'de_shuttering_and_removal_of_slab_formwork_as_permitted_by_the_engineer']::text[], false),
  (2, 1, 'Structure — slab cycle', 'Structure', 'Setting out: grid lines, columns and walls', 'setting_out_grid_lines_columns_and_walls', 30, ARRAY['surveying_and_marking_column_locations_and_grid_lines']::text[], false),
  (3, 1, 'Structure — slab cycle', 'Structure', 'Column / shear wall reinforcement and stirrups', 'column_shear_wall_reinforcement_and_stirrups', 30, ARRAY['column_reinforcement_cutting_bending_and_fixing', 'column_stirrups_ties_installation', 'column_reinforcement_inspection_and_cover_block_placement']::text[], false),
  (4, 1, 'Structure — slab cycle', 'Structure', 'Column formwork, line and plumb checks', 'column_formwork_line_and_plumb_checks', 30, ARRAY['column_formwork_shuttering_installation', 'column_verticality_dimensions_and_alignment_checks']::text[], false),
  (5, 1, 'Structure — slab cycle', 'Structure', 'Column concreting (if cast separately)', 'column_concreting_if_cast_separately', 30, ARRAY['column_concreting_where_columns_are_cast_separately_from_the_slab']::text[], false),
  (6, 1, 'Structure — slab cycle', 'Structure', 'Beam and slab staging, props and deck shuttering', 'beam_and_slab_staging_props_and_deck_shuttering', 30, ARRAY['prop_staging_scaffolding_installation', 'beam_bottom_shuttering_installation', 'beam_side_shuttering_installation', 'slab_centering_and_deck_shuttering_installation', 'checking_formwork_levels_line_level_and_alignment']::text[], false),
  (7, 1, 'Structure — slab cycle', 'Structure', 'Beam and slab reinforcement, chairs and cover blocks', 'beam_and_slab_reinforcement_chairs_and_cover_blocks', 30, ARRAY['beam_bottom_reinforcement_fixing', 'beam_top_reinforcement_and_extra_bars_fixing', 'slab_bottom_reinforcement_fixing', 'slab_top_reinforcement_and_negative_bars_fixing', 'chair_bars_spacers_installation']::text[], false),
  (8, 1, 'Structure — slab cycle', 'Structure', 'Sunken slab, drop, opening and shaft provisions', 'sunken_slab_drop_opening_and_shaft_provisions', 30, ARRAY['providing_slab_openings_shafts_and_service_cut_outs_as_per_drawings', 'parapet_upstand_sunken_area_provisions_where_applicable']::text[], false),
  (9, 1, 'Structure — slab cycle', 'Structure', 'Electrical conduits, boxes and plumbing sleeves in slab', 'electrical_conduits_boxes_and_plumbing_sleeves_in_slab', 30, ARRAY['electrical_conduits_embedded_in_slab_as_per_drawings', 'sleeves_for_plumbing_and_drainage_pipes']::text[], false),
  (10, 1, 'Structure — slab cycle', 'Structure', 'Pre-pour inspection (structural, MEP, safety)', 'pre_pour_inspection_structural_mep_safety', 30, ARRAY['pre_pour_checklist_approval', 'structural_engineer_s_reinforcement_inspection']::text[], true),
  (11, 1, 'Structure — slab cycle', 'Structure', 'Slab concreting, compaction and level finishing', 'slab_concreting_compaction_and_level_finishing', 30, ARRAY['slab_concreting', 'concrete_compaction_finishing_and_level_checks']::text[], true),
  (12, 1, 'Structure — slab cycle', 'Structure', 'Curing started; cube samples taken', 'curing_started_cube_samples_taken', 30, ARRAY['curing_initiation_as_specified']::text[], false),
  (13, 1, 'Structure — slab cycle', 'Structure', '7-day / 28-day cube results recorded', '7_day_28_day_cube_results_recorded', 30, ARRAY[]::text[], true)
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
WHERE t.key = 'pre_slab_v2'
ON CONFLICT (template_id, step_number) DO UPDATE SET
  phase_number = EXCLUDED.phase_number, phase_name = EXCLUDED.phase_name, phase_stage = EXCLUDED.phase_stage,
  title = EXCLUDED.title, step_key = EXCLUDED.step_key, phase_weight = EXCLUDED.phase_weight,
  alias_keys = EXCLUDED.alias_keys, photo_expected = EXCLUDED.photo_expected;

-- Finishing (conventional) (57 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track, base_key)
VALUES ('post_slab_v2', 'Finishing (conventional)', 2, TRUE, 'conventional', 'post_slab', 'post_slab_v2')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, version = 2, method = EXCLUDED.method, track = EXCLUDED.track, base_key = EXCLUDED.base_key;
INSERT INTO public.progression_template_steps
  (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key, v.phase_weight, v.alias_keys, v.photo_expected
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Walls — masonry', 'Walls', 'Wall marking: rooms, doors and shafts', 'wall_marking_rooms_doors_and_shafts', 10, ARRAY['marking_of_walls_room_layouts_shafts_and_openings']::text[], false),
  (2, 1, 'Walls — masonry', 'Walls', 'Blockwork / AAC / brickwork', 'blockwork_aac_brickwork', 10, ARRAY['blockwork_aac_blockwork_brickwork', 'internal_partition_walls_and_external_infill_walls']::text[], false),
  (3, 1, 'Walls — masonry', 'Walls', 'Lintels, sill bands, door and window openings', 'lintels_sill_bands_door_and_window_openings', 10, ARRAY['door_and_window_openings_lintels_and_sill_level_provisions']::text[], false),
  (4, 1, 'Walls — masonry', 'Walls', 'Door frames fixed and aligned', 'door_frames_fixed_and_aligned', 10, ARRAY['doorframe_installation_and_alignment_where_frames_are_embedded_during_masonry', 'doorframe_fixing_and_final_alignment_if_not_already_completed']::text[], false),
  (5, 1, 'Walls — masonry', 'Walls', 'Masonry curing', 'masonry_curing', 10, ARRAY[]::text[], false),
  (6, 2, 'Services first fix', 'Services', 'Wall chasing (block walls)', 'wall_chasing_block_walls', 12, ARRAY['wall_chasing_and_openings_for_electrical_and_plumbing_services_coordinated_with_masonry', 'wall_chasing_for_services_in_block_walls_only']::text[], false),
  (7, 2, 'Services first fix', 'Services', 'Electrical conduits and boxes in walls', 'electrical_conduits_and_boxes_in_walls', 12, ARRAY['electrical_conduit_installation_in_walls_and_slabs_as_applicable', 'switchboard_boxes_and_electrical_junction_boxes']::text[], false),
  (8, 2, 'Services first fix', 'Services', 'Concealed water supply lines (CPVC / PPR)', 'concealed_water_supply_lines_cpvc_ppr', 12, ARRAY['concealed_plumbing_water_supply_lines', 'plumbing_risers_and_shaft_piping']::text[], false),
  (9, 2, 'Services first fix', 'Services', 'Soil, waste and drainage lines (toilets, kitchen)', 'soil_waste_and_drainage_lines_toilets_kitchen', 12, ARRAY['soil_waste_and_drainage_pipes_including_bathroom_and_kitchen_connections']::text[], false),
  (10, 2, 'Services first fix', 'Services', 'AC copper piping and drain lines (if applicable)', 'ac_copper_piping_and_drain_lines_if_applicable', 12, ARRAY['ac_refrigerant_piping_drain_lines_and_other_concealed_services_if_applicable']::text[], false),
  (11, 2, 'Services first fix', 'Services', 'Fire sprinkler / detector lines (if applicable)', 'fire_sprinkler_detector_lines_if_applicable', 12, ARRAY[]::text[], false),
  (12, 2, 'Services first fix', 'Services', 'Low-voltage: CCTV, intercom and data conduits', 'low_voltage_cctv_intercom_and_data_conduits', 12, ARRAY[]::text[], false),
  (13, 2, 'Services first fix', 'Services', 'Gas line (if applicable)', 'gas_line_if_applicable', 12, ARRAY[]::text[], false),
  (14, 2, 'Services first fix', 'Services', 'Pressure test (plumbing) and continuity test (electrical)', 'pressure_test_plumbing_and_continuity_test_electrical', 12, ARRAY['electrical_continuity_checks_and_plumbing_pressure_leak_tests_before_covering']::text[], true),
  (15, 2, 'Services first fix', 'Services', 'Chase filling and mesh at RCC–masonry joints', 'chase_filling_and_mesh_at_rcc_masonry_joints', 12, ARRAY['electrical_and_plumbing_chase_filling', 'chicken_mesh_fibre_mesh_at_masonry_to_rcc_junctions_where_specified']::text[], false),
  (16, 3, 'Plaster and ceilings', 'Plaster', 'Internal wall plaster', 'internal_wall_plaster', 10, ARRAY['internal_wall_plaster']::text[], false),
  (17, 3, 'Plaster and ceilings', 'Plaster', 'Ceiling plaster / punning', 'ceiling_plaster_punning', 10, ARRAY[]::text[], false),
  (18, 3, 'Plaster and ceilings', 'Plaster', 'Plaster curing and level checks', 'plaster_curing_and_level_checks', 10, ARRAY['plaster_curing_and_surface_level_checks']::text[], false),
  (19, 3, 'Plaster and ceilings', 'Plaster', 'False ceiling framing (gypsum / POP, if specified)', 'false_ceiling_framing_gypsum_pop_if_specified', 10, ARRAY[]::text[], false),
  (20, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Sunken slab cleaning and pipe-sleeve sealing', 'sunken_slab_cleaning_and_pipe_sleeve_sealing', 8, ARRAY['bathroom_and_toilet_floor_level_preparation_and_slope_formation']::text[], true),
  (21, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Sunken slab waterproofing (coating + fibre mesh at corners)', 'sunken_slab_waterproofing_coating_fibre_mesh_at_corners', 8, ARRAY['waterproofing_in_toilets_bathrooms_balconies_and_other_specified_areas']::text[], true),
  (22, 4, 'Waterproofing (wet areas)', 'Waterproofing', '48-hour ponding test, sunken areas', '48_hour_ponding_test_sunken_areas', 8, ARRAY['water_ponding_test_and_rectification_where_applicable']::text[], true),
  (23, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Sunken filling (brick bat / light-weight concrete) and screed to slope', 'sunken_filling_brick_bat_light_weight_concrete_and_screed_to_slope', 8, ARRAY[]::text[], true),
  (24, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Toilet floor + 300 mm wall upturn waterproofing', 'toilet_floor_300_mm_wall_upturn_waterproofing', 8, ARRAY['waterproofing_upturns_and_pipe_junction_treatment']::text[], true),
  (25, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Shower area wall waterproofing (up to 1.8 m)', 'shower_area_wall_waterproofing_up_to_1_8_m', 8, ARRAY[]::text[], true),
  (26, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Balcony and utility waterproofing', 'balcony_and_utility_waterproofing', 8, ARRAY[]::text[], true),
  (27, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Kitchen sink-area waterproofing', 'kitchen_sink_area_waterproofing', 8, ARRAY['kitchen_platform_and_plumbing_point_coordination']::text[], true),
  (28, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Final ponding test and sign-off before tiling', 'final_ponding_test_and_sign_off_before_tiling', 8, ARRAY[]::text[], true),
  (29, 5, 'Flooring and tiling', 'Flooring', 'Floor levels and base mortar', 'floor_levels_and_base_mortar', 12, ARRAY['floor_base_preparation_and_level_marking']::text[], false),
  (30, 5, 'Flooring and tiling', 'Flooring', 'Toilet floor tiles with slope to drain', 'toilet_floor_tiles_with_slope_to_drain', 12, ARRAY['bathroom_and_toilet_floor_tiles_with_correct_slope']::text[], false),
  (31, 5, 'Flooring and tiling', 'Flooring', 'Toilet wall tiles / dado', 'toilet_wall_tiles_dado', 12, ARRAY['bathroom_wall_tiles']::text[], false),
  (32, 5, 'Flooring and tiling', 'Flooring', 'Kitchen platform and dado tiles', 'kitchen_platform_and_dado_tiles', 12, ARRAY['kitchen_dado_tiles_where_specified']::text[], false),
  (33, 5, 'Flooring and tiling', 'Flooring', 'Room flooring (vitrified / marble / wood)', 'room_flooring_vitrified_marble_wood', 12, ARRAY['room_flooring_tiles_marble_or_other_specified_material']::text[], false),
  (34, 5, 'Flooring and tiling', 'Flooring', 'Skirting, door thresholds and granite patti', 'skirting_door_thresholds_and_granite_patti', 12, ARRAY['door_thresholds_granite_patti']::text[], false),
  (35, 5, 'Flooring and tiling', 'Flooring', 'Window sills', 'window_sills', 12, ARRAY['window_sill_installation_granite_patti_stone_sill']::text[], false),
  (36, 5, 'Flooring and tiling', 'Flooring', 'Grouting and cleaning', 'grouting_and_cleaning', 12, ARRAY['skirting_and_tile_grouting']::text[], false),
  (37, 5, 'Flooring and tiling', 'Flooring', 'Staircase and lobby flooring (common floors)', 'staircase_and_lobby_flooring_common_floors', 12, ARRAY['staircase_stonework_and_common_area_flooring_as_applicable']::text[], false),
  (38, 6, 'Doors, windows and metal work', 'Openings', 'Window frames / sub-frames fixed and sealed', 'window_frames_sub_frames_fixed_and_sealed', 6, ARRAY['window_frames_or_sub_frames_in_cast_openings']::text[], false),
  (39, 6, 'Doors, windows and metal work', 'Openings', 'Window shutters and glass', 'window_shutters_and_glass', 6, ARRAY['window_frame_and_shutter_installation']::text[], false),
  (40, 6, 'Doors, windows and metal work', 'Openings', 'Door shutters, hardware and locks', 'door_shutters_hardware_and_locks', 6, ARRAY['door_shutters_hardware_and_locks']::text[], false),
  (41, 6, 'Doors, windows and metal work', 'Openings', 'MS grills, balcony railings and safety grills', 'ms_grills_balcony_railings_and_safety_grills', 6, ARRAY[]::text[], false),
  (42, 7, 'Painting', 'Paint', 'Wall putty (2 coats) and sanding', 'wall_putty_2_coats_and_sanding', 7, ARRAY['internal_wall_putty_and_surface_preparation']::text[], false),
  (43, 7, 'Painting', 'Paint', 'Primer', 'primer', 7, ARRAY['primer_application']::text[], false),
  (44, 7, 'Painting', 'Paint', 'First coat of paint', 'first_coat_of_paint', 7, ARRAY['first_coat_of_paint']::text[], false),
  (45, 7, 'Painting', 'Paint', 'Final coat of paint and touch-ups', 'final_coat_of_paint_and_touch_ups', 7, ARRAY['final_paint_coat_and_touch_ups']::text[], false),
  (46, 8, 'Fixtures and second fix', 'Fixtures', 'Electrical wiring, switches, sockets and DB dressing', 'electrical_wiring_switches_sockets_and_db_dressing', 3, ARRAY['electrical_wires_switches_sockets_and_distribution_board_connections', 'wiring_pulled_through_embedded_conduits']::text[], false),
  (47, 8, 'Fixtures and second fix', 'Fixtures', 'Earthing and ELCB / RCCB testing', 'earthing_and_elcb_rccb_testing', 3, ARRAY['electrical_testing_and_functional_checks']::text[], true),
  (48, 8, 'Fixtures and second fix', 'Fixtures', 'Light fittings and false-ceiling closing', 'light_fittings_and_false_ceiling_closing', 3, ARRAY['false_ceiling_and_light_fixtures_where_specified']::text[], false),
  (49, 8, 'Fixtures and second fix', 'Fixtures', 'Sanitaryware, WC and washbasin', 'sanitaryware_wc_and_washbasin', 3, ARRAY['sanitaryware_wc_washbasin_and_bathroom_fittings']::text[], false),
  (50, 8, 'Fixtures and second fix', 'Fixtures', 'CP fittings: taps, mixers, showers', 'cp_fittings_taps_mixers_showers', 3, ARRAY['plumbing_taps_mixers_and_accessories']::text[], false),
  (51, 8, 'Fixtures and second fix', 'Fixtures', 'Kitchen sink and fittings', 'kitchen_sink_and_fittings', 3, ARRAY['kitchen_platform_sink_and_related_fittings']::text[], false),
  (52, 8, 'Fixtures and second fix', 'Fixtures', 'AC indoor units (if applicable)', 'ac_indoor_units_if_applicable', 3, ARRAY['ac_indoor_units_and_other_mep_equipment_where_applicable']::text[], false),
  (53, 9, 'Snagging and handover', 'Handover', 'Electrical and plumbing functional test', 'electrical_and_plumbing_functional_test', 2, ARRAY['plumbing_leak_checks_and_drainage_flow_testing', 'door_window_and_hardware_operation_checks']::text[], false),
  (54, 9, 'Snagging and handover', 'Handover', 'Snag list made', 'snag_list_made', 2, ARRAY['snagging_inspection_and_defect_rectification']::text[], false),
  (55, 9, 'Snagging and handover', 'Handover', 'Snags rectified', 'snags_rectified', 2, ARRAY['sealant_application_and_finishing_corrections']::text[], false),
  (56, 9, 'Snagging and handover', 'Handover', 'Deep cleaning', 'deep_cleaning', 2, ARRAY['deep_cleaning_and_final_handover']::text[], false),
  (57, 9, 'Snagging and handover', 'Handover', 'Floor handed over', 'floor_handed_over', 2, ARRAY[]::text[], true)
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
WHERE t.key = 'post_slab_v2'
ON CONFLICT (template_id, step_number) DO UPDATE SET
  phase_number = EXCLUDED.phase_number, phase_name = EXCLUDED.phase_name, phase_stage = EXCLUDED.phase_stage,
  title = EXCLUDED.title, step_key = EXCLUDED.step_key, phase_weight = EXCLUDED.phase_weight,
  alias_keys = EXCLUDED.alias_keys, photo_expected = EXCLUDED.photo_expected;

-- Structure (Mivan) (14 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track, base_key)
VALUES ('pre_slab_mivan_v2', 'Structure (Mivan)', 2, TRUE, 'mivan', 'pre_slab', 'pre_slab_mivan_v2')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, version = 2, method = EXCLUDED.method, track = EXCLUDED.track, base_key = EXCLUDED.base_key;
INSERT INTO public.progression_template_steps
  (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key, v.phase_weight, v.alias_keys, v.photo_expected
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Previous slab de-shuttering, as the engineer permits', 'previous_slab_de_shuttering_as_the_engineer_permits', 30, ARRAY['de_shuttering_of_previous_floor_wall_and_slab_panels_props_retained_as_permitted_by_the_engineer']::text[], false),
  (2, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Setting out: grid lines, columns and walls', 'setting_out_grid_lines_columns_and_walls', 30, ARRAY['surveying_and_marking_grid_lines_walls_and_openings']::text[], false),
  (3, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Reinforcement for walls and columns', 'reinforcement_for_walls_and_columns', 30, ARRAY['reinforcement_fixing_for_walls_and_columns', 'trimmer_bars_and_reinforcement_around_openings']::text[], false),
  (4, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Electrical conduits and boxes fixed in walls', 'electrical_conduits_and_boxes_fixed_in_walls', 30, ARRAY['electrical_conduits_switch_and_junction_boxes_fixed_in_walls']::text[], false),
  (5, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Plumbing sleeves and concealed pipes in walls', 'plumbing_sleeves_and_concealed_pipes_in_walls', 30, ARRAY['plumbing_sleeves_and_concealed_pipes_in_walls_as_applicable']::text[], false),
  (6, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Door and window opening boxes and block-outs', 'door_and_window_opening_boxes_and_block_outs', 30, ARRAY['door_and_window_opening_boxes_and_block_outs']::text[], false),
  (7, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Aluminium wall and deck panels erected', 'aluminium_wall_and_deck_panels_erected', 30, ARRAY['aluminium_wall_panels_for_walls_both_faces_with_pins_wedges_and_ties', 'beam_soffit_and_slab_deck_panels_with_props']::text[], false),
  (8, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Formwork line, level, plumb and diagonal checks', 'formwork_line_level_plumb_and_diagonal_checks', 30, ARRAY['formwork_line_level_plumb_and_diagonal_checks']::text[], false),
  (9, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Beam and slab reinforcement, chairs and cover blocks', 'beam_and_slab_reinforcement_chairs_and_cover_blocks', 30, ARRAY['slab_bottom_reinforcement_fixing', 'slab_top_reinforcement_and_negative_bars_fixing', 'chair_bars_spacers_installation']::text[], false),
  (10, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Electrical conduits, boxes and plumbing sleeves in slab', 'electrical_conduits_boxes_and_plumbing_sleeves_in_slab', 30, ARRAY['electrical_conduits_embedded_in_slab_as_per_drawings', 'sleeves_for_plumbing_and_drainage_pipes']::text[], false),
  (11, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Pre-pour inspection (structural, MEP, safety)', 'pre_pour_inspection_structural_mep_safety', 30, ARRAY['formwork_reinforcement_and_mep_inspection_before_the_pour']::text[], true),
  (12, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Walls and slab poured together, compaction and level finishing', 'walls_and_slab_poured_together_compaction_and_level_finishing', 30, ARRAY['walls_and_slab_poured_together', 'concrete_compaction_finishing_and_level_checks']::text[], true),
  (13, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Curing started; cube samples taken', 'curing_started_cube_samples_taken', 30, ARRAY['curing_initiation_as_specified', 'cube_samples_taken']::text[], false),
  (14, 1, 'Structure — aluminium formwork cycle', 'Structure', '7-day / 28-day cube results recorded', '7_day_28_day_cube_results_recorded', 30, ARRAY[]::text[], true)
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
WHERE t.key = 'pre_slab_mivan_v2'
ON CONFLICT (template_id, step_number) DO UPDATE SET
  phase_number = EXCLUDED.phase_number, phase_name = EXCLUDED.phase_name, phase_stage = EXCLUDED.phase_stage,
  title = EXCLUDED.title, step_key = EXCLUDED.step_key, phase_weight = EXCLUDED.phase_weight,
  alias_keys = EXCLUDED.alias_keys, photo_expected = EXCLUDED.photo_expected;

-- Finishing (Mivan) (52 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track, base_key)
VALUES ('post_slab_mivan_v2', 'Finishing (Mivan)', 2, TRUE, 'mivan', 'post_slab', 'post_slab_mivan_v2')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, version = 2, method = EXCLUDED.method, track = EXCLUDED.track, base_key = EXCLUDED.base_key;
INSERT INTO public.progression_template_steps
  (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key, v.phase_weight, v.alias_keys, v.photo_expected
FROM public.progression_templates t,
(VALUES
  (1, 1, 'After the pour', 'Surface preparation', 'Fin and honeycomb removal, surface repair', 'fin_and_honeycomb_removal_surface_repair', 6, ARRAY['fin_and_honeycomb_removal_and_surface_repair']::text[], false),
  (2, 1, 'After the pour', 'Surface preparation', 'Tie-hole filling', 'tie_hole_filling', 6, ARRAY['tie_hole_filling']::text[], false),
  (3, 1, 'After the pour', 'Surface preparation', 'Slab level and wall plumb survey', 'slab_level_and_wall_plumb_survey', 6, ARRAY['slab_level_and_wall_plumb_survey']::text[], false),
  (4, 1, 'After the pour', 'Surface preparation', 'Prop removal once the slab reaches strength', 'prop_removal_once_the_slab_reaches_strength', 6, ARRAY['prop_removal_once_the_slab_reaches_strength']::text[], false),
  (5, 2, 'Services first fix', 'Services', 'Electrical conduits and boxes in walls', 'electrical_conduits_and_boxes_in_walls', 14, ARRAY['electrical_conduit_installation_in_walls_and_slabs_as_applicable', 'switchboard_boxes_and_electrical_junction_boxes']::text[], false),
  (6, 2, 'Services first fix', 'Services', 'Concealed water supply lines (CPVC / PPR)', 'concealed_water_supply_lines_cpvc_ppr', 14, ARRAY['concealed_plumbing_water_supply_lines', 'plumbing_risers_and_shaft_piping']::text[], false),
  (7, 2, 'Services first fix', 'Services', 'Soil, waste and drainage lines (toilets, kitchen)', 'soil_waste_and_drainage_lines_toilets_kitchen', 14, ARRAY['soil_waste_and_drainage_pipes_including_bathroom_and_kitchen_connections']::text[], false),
  (8, 2, 'Services first fix', 'Services', 'AC copper piping and drain lines (if applicable)', 'ac_copper_piping_and_drain_lines_if_applicable', 14, ARRAY['ac_refrigerant_piping_drain_lines_and_other_concealed_services_if_applicable']::text[], false),
  (9, 2, 'Services first fix', 'Services', 'Fire sprinkler / detector lines (if applicable)', 'fire_sprinkler_detector_lines_if_applicable', 14, ARRAY[]::text[], false),
  (10, 2, 'Services first fix', 'Services', 'Low-voltage: CCTV, intercom and data conduits', 'low_voltage_cctv_intercom_and_data_conduits', 14, ARRAY[]::text[], false),
  (11, 2, 'Services first fix', 'Services', 'Gas line (if applicable)', 'gas_line_if_applicable', 14, ARRAY[]::text[], false),
  (12, 2, 'Services first fix', 'Services', 'Pressure test (plumbing) and continuity test (electrical)', 'pressure_test_plumbing_and_continuity_test_electrical', 14, ARRAY['electrical_continuity_checks_and_plumbing_pressure_leak_tests_before_covering']::text[], true),
  (13, 3, 'Wall finish (no plaster)', 'Wall finish', 'Gypsum punning / skim coat on walls and ceilings', 'gypsum_punning_skim_coat_on_walls_and_ceilings', 8, ARRAY['gypsum_punning_skim_coat_on_walls_and_ceilings']::text[], false),
  (14, 3, 'Wall finish (no plaster)', 'Wall finish', 'False ceiling framing (gypsum / POP, if specified)', 'false_ceiling_framing_gypsum_pop_if_specified', 8, ARRAY[]::text[], false),
  (15, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Sunken slab cleaning and pipe-sleeve sealing', 'sunken_slab_cleaning_and_pipe_sleeve_sealing', 9, ARRAY['bathroom_and_toilet_floor_level_preparation_and_slope_formation']::text[], true),
  (16, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Sunken slab waterproofing (coating + fibre mesh at corners)', 'sunken_slab_waterproofing_coating_fibre_mesh_at_corners', 9, ARRAY['waterproofing_in_toilets_bathrooms_balconies_and_other_specified_areas']::text[], true),
  (17, 4, 'Waterproofing (wet areas)', 'Waterproofing', '48-hour ponding test, sunken areas', '48_hour_ponding_test_sunken_areas', 9, ARRAY['water_ponding_test_and_rectification_where_applicable']::text[], true),
  (18, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Sunken filling (brick bat / light-weight concrete) and screed to slope', 'sunken_filling_brick_bat_light_weight_concrete_and_screed_to_slope', 9, ARRAY[]::text[], true),
  (19, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Toilet floor + 300 mm wall upturn waterproofing', 'toilet_floor_300_mm_wall_upturn_waterproofing', 9, ARRAY['waterproofing_upturns_and_pipe_junction_treatment']::text[], true),
  (20, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Shower area wall waterproofing (up to 1.8 m)', 'shower_area_wall_waterproofing_up_to_1_8_m', 9, ARRAY[]::text[], true),
  (21, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Balcony and utility waterproofing', 'balcony_and_utility_waterproofing', 9, ARRAY[]::text[], true),
  (22, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Kitchen sink-area waterproofing', 'kitchen_sink_area_waterproofing', 9, ARRAY['kitchen_platform_and_plumbing_point_coordination']::text[], true),
  (23, 4, 'Waterproofing (wet areas)', 'Waterproofing', 'Final ponding test and sign-off before tiling', 'final_ponding_test_and_sign_off_before_tiling', 9, ARRAY[]::text[], true),
  (24, 5, 'Flooring and tiling', 'Flooring', 'Floor levels and base mortar', 'floor_levels_and_base_mortar', 14, ARRAY['floor_base_preparation_and_level_marking']::text[], false),
  (25, 5, 'Flooring and tiling', 'Flooring', 'Toilet floor tiles with slope to drain', 'toilet_floor_tiles_with_slope_to_drain', 14, ARRAY['bathroom_and_toilet_floor_tiles_with_correct_slope']::text[], false),
  (26, 5, 'Flooring and tiling', 'Flooring', 'Toilet wall tiles / dado', 'toilet_wall_tiles_dado', 14, ARRAY['bathroom_wall_tiles']::text[], false),
  (27, 5, 'Flooring and tiling', 'Flooring', 'Kitchen platform and dado tiles', 'kitchen_platform_and_dado_tiles', 14, ARRAY['kitchen_dado_tiles_where_specified']::text[], false),
  (28, 5, 'Flooring and tiling', 'Flooring', 'Room flooring (vitrified / marble / wood)', 'room_flooring_vitrified_marble_wood', 14, ARRAY['room_flooring_tiles_marble_or_other_specified_material']::text[], false),
  (29, 5, 'Flooring and tiling', 'Flooring', 'Skirting, door thresholds and granite patti', 'skirting_door_thresholds_and_granite_patti', 14, ARRAY['door_thresholds_granite_patti']::text[], false),
  (30, 5, 'Flooring and tiling', 'Flooring', 'Window sills', 'window_sills', 14, ARRAY['window_sill_installation_granite_patti_stone_sill']::text[], false),
  (31, 5, 'Flooring and tiling', 'Flooring', 'Grouting and cleaning', 'grouting_and_cleaning', 14, ARRAY['skirting_and_tile_grouting']::text[], false),
  (32, 5, 'Flooring and tiling', 'Flooring', 'Staircase and lobby flooring (common floors)', 'staircase_and_lobby_flooring_common_floors', 14, ARRAY['staircase_stonework_and_common_area_flooring_as_applicable']::text[], false),
  (33, 6, 'Doors, windows and metal work', 'Openings', 'Window frames / sub-frames fixed and sealed', 'window_frames_sub_frames_fixed_and_sealed', 7, ARRAY['window_frames_or_sub_frames_in_cast_openings']::text[], false),
  (34, 6, 'Doors, windows and metal work', 'Openings', 'Window shutters and glass', 'window_shutters_and_glass', 7, ARRAY['window_frame_and_shutter_installation']::text[], false),
  (35, 6, 'Doors, windows and metal work', 'Openings', 'Door shutters, hardware and locks', 'door_shutters_hardware_and_locks', 7, ARRAY['door_shutters_hardware_and_locks']::text[], false),
  (36, 6, 'Doors, windows and metal work', 'Openings', 'MS grills, balcony railings and safety grills', 'ms_grills_balcony_railings_and_safety_grills', 7, ARRAY[]::text[], false),
  (37, 7, 'Painting', 'Paint', 'Wall putty (2 coats) and sanding', 'wall_putty_2_coats_and_sanding', 7, ARRAY['internal_wall_putty_and_surface_preparation']::text[], false),
  (38, 7, 'Painting', 'Paint', 'Primer', 'primer', 7, ARRAY['primer_application']::text[], false),
  (39, 7, 'Painting', 'Paint', 'First coat of paint', 'first_coat_of_paint', 7, ARRAY['first_coat_of_paint']::text[], false),
  (40, 7, 'Painting', 'Paint', 'Final coat of paint and touch-ups', 'final_coat_of_paint_and_touch_ups', 7, ARRAY['final_paint_coat_and_touch_ups']::text[], false),
  (41, 8, 'Fixtures and second fix', 'Fixtures', 'Electrical wiring, switches, sockets and DB dressing', 'electrical_wiring_switches_sockets_and_db_dressing', 3, ARRAY['electrical_wires_switches_sockets_and_distribution_board_connections', 'wiring_pulled_through_embedded_conduits']::text[], false),
  (42, 8, 'Fixtures and second fix', 'Fixtures', 'Earthing and ELCB / RCCB testing', 'earthing_and_elcb_rccb_testing', 3, ARRAY['electrical_testing_and_functional_checks']::text[], true),
  (43, 8, 'Fixtures and second fix', 'Fixtures', 'Light fittings and false-ceiling closing', 'light_fittings_and_false_ceiling_closing', 3, ARRAY['false_ceiling_and_light_fixtures_where_specified']::text[], false),
  (44, 8, 'Fixtures and second fix', 'Fixtures', 'Sanitaryware, WC and washbasin', 'sanitaryware_wc_and_washbasin', 3, ARRAY['sanitaryware_wc_washbasin_and_bathroom_fittings']::text[], false),
  (45, 8, 'Fixtures and second fix', 'Fixtures', 'CP fittings: taps, mixers, showers', 'cp_fittings_taps_mixers_showers', 3, ARRAY['plumbing_taps_mixers_and_accessories']::text[], false),
  (46, 8, 'Fixtures and second fix', 'Fixtures', 'Kitchen sink and fittings', 'kitchen_sink_and_fittings', 3, ARRAY['kitchen_platform_sink_and_related_fittings']::text[], false),
  (47, 8, 'Fixtures and second fix', 'Fixtures', 'AC indoor units (if applicable)', 'ac_indoor_units_if_applicable', 3, ARRAY['ac_indoor_units_and_other_mep_equipment_where_applicable']::text[], false),
  (48, 9, 'Snagging and handover', 'Handover', 'Electrical and plumbing functional test', 'electrical_and_plumbing_functional_test', 2, ARRAY['plumbing_leak_checks_and_drainage_flow_testing', 'door_window_and_hardware_operation_checks']::text[], false),
  (49, 9, 'Snagging and handover', 'Handover', 'Snag list made', 'snag_list_made', 2, ARRAY['snagging_inspection_and_defect_rectification']::text[], false),
  (50, 9, 'Snagging and handover', 'Handover', 'Snags rectified', 'snags_rectified', 2, ARRAY['sealant_application_and_finishing_corrections']::text[], false),
  (51, 9, 'Snagging and handover', 'Handover', 'Deep cleaning', 'deep_cleaning', 2, ARRAY['deep_cleaning_and_final_handover']::text[], false),
  (52, 9, 'Snagging and handover', 'Handover', 'Floor handed over', 'floor_handed_over', 2, ARRAY[]::text[], true)
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
WHERE t.key = 'post_slab_mivan_v2'
ON CONFLICT (template_id, step_number) DO UPDATE SET
  phase_number = EXCLUDED.phase_number, phase_name = EXCLUDED.phase_name, phase_stage = EXCLUDED.phase_stage,
  title = EXCLUDED.title, step_key = EXCLUDED.step_key, phase_weight = EXCLUDED.phase_weight,
  alias_keys = EXCLUDED.alias_keys, photo_expected = EXCLUDED.photo_expected;

-- Structure (Hybrid) (14 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track, base_key)
VALUES ('pre_slab_hybrid_v2', 'Structure (Hybrid)', 2, TRUE, 'hybrid', 'pre_slab', 'pre_slab_hybrid_v2')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, version = 2, method = EXCLUDED.method, track = EXCLUDED.track, base_key = EXCLUDED.base_key;
INSERT INTO public.progression_template_steps
  (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key, v.phase_weight, v.alias_keys, v.photo_expected
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Previous slab de-shuttering, as the engineer permits', 'previous_slab_de_shuttering_as_the_engineer_permits', 30, ARRAY['de_shuttering_of_previous_floor_wall_and_slab_panels_props_retained_as_permitted_by_the_engineer']::text[], false),
  (2, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Setting out: grid lines, columns and walls', 'setting_out_grid_lines_columns_and_walls', 30, ARRAY['surveying_and_marking_grid_lines_walls_and_openings']::text[], false),
  (3, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Reinforcement for outer and shear walls and columns', 'reinforcement_for_outer_and_shear_walls_and_columns', 30, ARRAY['reinforcement_fixing_for_outer_and_shear_walls_and_columns', 'trimmer_bars_and_reinforcement_around_openings']::text[], false),
  (4, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Electrical conduits and boxes fixed in outer and shear walls', 'electrical_conduits_and_boxes_fixed_in_outer_and_shear_walls', 30, ARRAY['electrical_conduits_switch_and_junction_boxes_fixed_in_outer_and_shear_walls']::text[], false),
  (5, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Plumbing sleeves and concealed pipes in outer and shear walls', 'plumbing_sleeves_and_concealed_pipes_in_outer_and_shear_walls', 30, ARRAY['plumbing_sleeves_and_concealed_pipes_in_outer_and_shear_walls_as_applicable']::text[], false),
  (6, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Door and window opening boxes and block-outs', 'door_and_window_opening_boxes_and_block_outs', 30, ARRAY['door_and_window_opening_boxes_and_block_outs']::text[], false),
  (7, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Aluminium wall and deck panels erected', 'aluminium_wall_and_deck_panels_erected', 30, ARRAY['aluminium_wall_panels_for_outer_and_shear_walls_both_faces_with_pins_wedges_and_ties', 'beam_soffit_and_slab_deck_panels_with_props']::text[], false),
  (8, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Formwork line, level, plumb and diagonal checks', 'formwork_line_level_plumb_and_diagonal_checks', 30, ARRAY['formwork_line_level_plumb_and_diagonal_checks']::text[], false),
  (9, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Beam and slab reinforcement, chairs and cover blocks', 'beam_and_slab_reinforcement_chairs_and_cover_blocks', 30, ARRAY['slab_bottom_reinforcement_fixing', 'slab_top_reinforcement_and_negative_bars_fixing', 'chair_bars_spacers_installation']::text[], false),
  (10, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Electrical conduits, boxes and plumbing sleeves in slab', 'electrical_conduits_boxes_and_plumbing_sleeves_in_slab', 30, ARRAY['electrical_conduits_embedded_in_slab_as_per_drawings', 'sleeves_for_plumbing_and_drainage_pipes']::text[], false),
  (11, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Pre-pour inspection (structural, MEP, safety)', 'pre_pour_inspection_structural_mep_safety', 30, ARRAY['formwork_reinforcement_and_mep_inspection_before_the_pour']::text[], true),
  (12, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Walls and slab poured together, compaction and level finishing', 'walls_and_slab_poured_together_compaction_and_level_finishing', 30, ARRAY['walls_and_slab_poured_together', 'concrete_compaction_finishing_and_level_checks']::text[], true),
  (13, 1, 'Structure — aluminium formwork cycle', 'Structure', 'Curing started; cube samples taken', 'curing_started_cube_samples_taken', 30, ARRAY['curing_initiation_as_specified', 'cube_samples_taken']::text[], false),
  (14, 1, 'Structure — aluminium formwork cycle', 'Structure', '7-day / 28-day cube results recorded', '7_day_28_day_cube_results_recorded', 30, ARRAY[]::text[], true)
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
WHERE t.key = 'pre_slab_hybrid_v2'
ON CONFLICT (template_id, step_number) DO UPDATE SET
  phase_number = EXCLUDED.phase_number, phase_name = EXCLUDED.phase_name, phase_stage = EXCLUDED.phase_stage,
  title = EXCLUDED.title, step_key = EXCLUDED.step_key, phase_weight = EXCLUDED.phase_weight,
  alias_keys = EXCLUDED.alias_keys, photo_expected = EXCLUDED.photo_expected;

-- Finishing (Hybrid) (59 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track, base_key)
VALUES ('post_slab_hybrid_v2', 'Finishing (Hybrid)', 2, TRUE, 'hybrid', 'post_slab', 'post_slab_hybrid_v2')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, version = 2, method = EXCLUDED.method, track = EXCLUDED.track, base_key = EXCLUDED.base_key;
INSERT INTO public.progression_template_steps
  (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key, v.phase_weight, v.alias_keys, v.photo_expected
FROM public.progression_templates t,
(VALUES
  (1, 1, 'After the pour', 'Surface preparation', 'Fin and honeycomb removal, surface repair', 'fin_and_honeycomb_removal_surface_repair', 5, ARRAY['fin_and_honeycomb_removal_and_surface_repair']::text[], false),
  (2, 1, 'After the pour', 'Surface preparation', 'Tie-hole filling', 'tie_hole_filling', 5, ARRAY['tie_hole_filling']::text[], false),
  (3, 1, 'After the pour', 'Surface preparation', 'Slab level and wall plumb survey', 'slab_level_and_wall_plumb_survey', 5, ARRAY['slab_level_and_wall_plumb_survey']::text[], false),
  (4, 1, 'After the pour', 'Surface preparation', 'Prop removal once the slab reaches strength', 'prop_removal_once_the_slab_reaches_strength', 5, ARRAY['prop_removal_once_the_slab_reaches_strength']::text[], false),
  (5, 2, 'Internal partitions', 'Walls', 'Blockwork / AAC partitions for internal walls', 'blockwork_aac_partitions_for_internal_walls', 6, ARRAY['blockwork_aac_partitions_for_internal_walls']::text[], false),
  (6, 2, 'Internal partitions', 'Walls', 'Lintels and door openings in block walls', 'lintels_and_door_openings_in_block_walls', 6, ARRAY['lintels_and_door_openings_in_block_walls']::text[], false),
  (7, 2, 'Internal partitions', 'Walls', 'Masonry curing', 'masonry_curing', 6, ARRAY[]::text[], false),
  (8, 3, 'Services first fix', 'Services', 'Wall chasing (block walls)', 'wall_chasing_block_walls', 12, ARRAY['wall_chasing_and_openings_for_electrical_and_plumbing_services_coordinated_with_masonry', 'wall_chasing_for_services_in_block_walls_only']::text[], false),
  (9, 3, 'Services first fix', 'Services', 'Electrical conduits and boxes in walls', 'electrical_conduits_and_boxes_in_walls', 12, ARRAY['electrical_conduit_installation_in_walls_and_slabs_as_applicable', 'switchboard_boxes_and_electrical_junction_boxes']::text[], false),
  (10, 3, 'Services first fix', 'Services', 'Concealed water supply lines (CPVC / PPR)', 'concealed_water_supply_lines_cpvc_ppr', 12, ARRAY['concealed_plumbing_water_supply_lines', 'plumbing_risers_and_shaft_piping']::text[], false),
  (11, 3, 'Services first fix', 'Services', 'Soil, waste and drainage lines (toilets, kitchen)', 'soil_waste_and_drainage_lines_toilets_kitchen', 12, ARRAY['soil_waste_and_drainage_pipes_including_bathroom_and_kitchen_connections']::text[], false),
  (12, 3, 'Services first fix', 'Services', 'AC copper piping and drain lines (if applicable)', 'ac_copper_piping_and_drain_lines_if_applicable', 12, ARRAY['ac_refrigerant_piping_drain_lines_and_other_concealed_services_if_applicable']::text[], false),
  (13, 3, 'Services first fix', 'Services', 'Fire sprinkler / detector lines (if applicable)', 'fire_sprinkler_detector_lines_if_applicable', 12, ARRAY[]::text[], false),
  (14, 3, 'Services first fix', 'Services', 'Low-voltage: CCTV, intercom and data conduits', 'low_voltage_cctv_intercom_and_data_conduits', 12, ARRAY[]::text[], false),
  (15, 3, 'Services first fix', 'Services', 'Gas line (if applicable)', 'gas_line_if_applicable', 12, ARRAY[]::text[], false),
  (16, 3, 'Services first fix', 'Services', 'Pressure test (plumbing) and continuity test (electrical)', 'pressure_test_plumbing_and_continuity_test_electrical', 12, ARRAY['electrical_continuity_checks_and_plumbing_pressure_leak_tests_before_covering']::text[], true),
  (17, 3, 'Services first fix', 'Services', 'Chase filling and mesh at RCC–masonry joints', 'chase_filling_and_mesh_at_rcc_masonry_joints', 12, ARRAY['electrical_and_plumbing_chase_filling', 'chicken_mesh_fibre_mesh_at_masonry_to_rcc_junctions_where_specified']::text[], false),
  (18, 4, 'Plaster and wall finish', 'Plaster', 'Internal plaster on block walls', 'internal_plaster_on_block_walls', 9, ARRAY['internal_plaster_on_block_walls']::text[], false),
  (19, 4, 'Plaster and wall finish', 'Plaster', 'Gypsum punning / skim coat on RCC walls', 'gypsum_punning_skim_coat_on_rcc_walls', 9, ARRAY['gypsum_punning_skim_coat_on_rcc_walls']::text[], false),
  (20, 4, 'Plaster and wall finish', 'Plaster', 'Plaster curing and level checks', 'plaster_curing_and_level_checks', 9, ARRAY['plaster_curing_and_surface_level_checks']::text[], false),
  (21, 4, 'Plaster and wall finish', 'Plaster', 'False ceiling framing (gypsum / POP, if specified)', 'false_ceiling_framing_gypsum_pop_if_specified', 9, ARRAY[]::text[], false),
  (22, 5, 'Waterproofing (wet areas)', 'Waterproofing', 'Sunken slab cleaning and pipe-sleeve sealing', 'sunken_slab_cleaning_and_pipe_sleeve_sealing', 8, ARRAY['bathroom_and_toilet_floor_level_preparation_and_slope_formation']::text[], true),
  (23, 5, 'Waterproofing (wet areas)', 'Waterproofing', 'Sunken slab waterproofing (coating + fibre mesh at corners)', 'sunken_slab_waterproofing_coating_fibre_mesh_at_corners', 8, ARRAY['waterproofing_in_toilets_bathrooms_balconies_and_other_specified_areas']::text[], true),
  (24, 5, 'Waterproofing (wet areas)', 'Waterproofing', '48-hour ponding test, sunken areas', '48_hour_ponding_test_sunken_areas', 8, ARRAY['water_ponding_test_and_rectification_where_applicable']::text[], true),
  (25, 5, 'Waterproofing (wet areas)', 'Waterproofing', 'Sunken filling (brick bat / light-weight concrete) and screed to slope', 'sunken_filling_brick_bat_light_weight_concrete_and_screed_to_slope', 8, ARRAY[]::text[], true),
  (26, 5, 'Waterproofing (wet areas)', 'Waterproofing', 'Toilet floor + 300 mm wall upturn waterproofing', 'toilet_floor_300_mm_wall_upturn_waterproofing', 8, ARRAY['waterproofing_upturns_and_pipe_junction_treatment']::text[], true),
  (27, 5, 'Waterproofing (wet areas)', 'Waterproofing', 'Shower area wall waterproofing (up to 1.8 m)', 'shower_area_wall_waterproofing_up_to_1_8_m', 8, ARRAY[]::text[], true),
  (28, 5, 'Waterproofing (wet areas)', 'Waterproofing', 'Balcony and utility waterproofing', 'balcony_and_utility_waterproofing', 8, ARRAY[]::text[], true),
  (29, 5, 'Waterproofing (wet areas)', 'Waterproofing', 'Kitchen sink-area waterproofing', 'kitchen_sink_area_waterproofing', 8, ARRAY['kitchen_platform_and_plumbing_point_coordination']::text[], true),
  (30, 5, 'Waterproofing (wet areas)', 'Waterproofing', 'Final ponding test and sign-off before tiling', 'final_ponding_test_and_sign_off_before_tiling', 8, ARRAY[]::text[], true),
  (31, 6, 'Flooring and tiling', 'Flooring', 'Floor levels and base mortar', 'floor_levels_and_base_mortar', 12, ARRAY['floor_base_preparation_and_level_marking']::text[], false),
  (32, 6, 'Flooring and tiling', 'Flooring', 'Toilet floor tiles with slope to drain', 'toilet_floor_tiles_with_slope_to_drain', 12, ARRAY['bathroom_and_toilet_floor_tiles_with_correct_slope']::text[], false),
  (33, 6, 'Flooring and tiling', 'Flooring', 'Toilet wall tiles / dado', 'toilet_wall_tiles_dado', 12, ARRAY['bathroom_wall_tiles']::text[], false),
  (34, 6, 'Flooring and tiling', 'Flooring', 'Kitchen platform and dado tiles', 'kitchen_platform_and_dado_tiles', 12, ARRAY['kitchen_dado_tiles_where_specified']::text[], false),
  (35, 6, 'Flooring and tiling', 'Flooring', 'Room flooring (vitrified / marble / wood)', 'room_flooring_vitrified_marble_wood', 12, ARRAY['room_flooring_tiles_marble_or_other_specified_material']::text[], false),
  (36, 6, 'Flooring and tiling', 'Flooring', 'Skirting, door thresholds and granite patti', 'skirting_door_thresholds_and_granite_patti', 12, ARRAY['door_thresholds_granite_patti']::text[], false),
  (37, 6, 'Flooring and tiling', 'Flooring', 'Window sills', 'window_sills', 12, ARRAY['window_sill_installation_granite_patti_stone_sill']::text[], false),
  (38, 6, 'Flooring and tiling', 'Flooring', 'Grouting and cleaning', 'grouting_and_cleaning', 12, ARRAY['skirting_and_tile_grouting']::text[], false),
  (39, 6, 'Flooring and tiling', 'Flooring', 'Staircase and lobby flooring (common floors)', 'staircase_and_lobby_flooring_common_floors', 12, ARRAY['staircase_stonework_and_common_area_flooring_as_applicable']::text[], false),
  (40, 7, 'Doors, windows and metal work', 'Openings', 'Window frames / sub-frames fixed and sealed', 'window_frames_sub_frames_fixed_and_sealed', 6, ARRAY['window_frames_or_sub_frames_in_cast_openings']::text[], false),
  (41, 7, 'Doors, windows and metal work', 'Openings', 'Window shutters and glass', 'window_shutters_and_glass', 6, ARRAY['window_frame_and_shutter_installation']::text[], false),
  (42, 7, 'Doors, windows and metal work', 'Openings', 'Door shutters, hardware and locks', 'door_shutters_hardware_and_locks', 6, ARRAY['door_shutters_hardware_and_locks']::text[], false),
  (43, 7, 'Doors, windows and metal work', 'Openings', 'MS grills, balcony railings and safety grills', 'ms_grills_balcony_railings_and_safety_grills', 6, ARRAY[]::text[], false),
  (44, 8, 'Painting', 'Paint', 'Wall putty (2 coats) and sanding', 'wall_putty_2_coats_and_sanding', 7, ARRAY['internal_wall_putty_and_surface_preparation']::text[], false),
  (45, 8, 'Painting', 'Paint', 'Primer', 'primer', 7, ARRAY['primer_application']::text[], false),
  (46, 8, 'Painting', 'Paint', 'First coat of paint', 'first_coat_of_paint', 7, ARRAY['first_coat_of_paint']::text[], false),
  (47, 8, 'Painting', 'Paint', 'Final coat of paint and touch-ups', 'final_coat_of_paint_and_touch_ups', 7, ARRAY['final_paint_coat_and_touch_ups']::text[], false),
  (48, 9, 'Fixtures and second fix', 'Fixtures', 'Electrical wiring, switches, sockets and DB dressing', 'electrical_wiring_switches_sockets_and_db_dressing', 3, ARRAY['electrical_wires_switches_sockets_and_distribution_board_connections', 'wiring_pulled_through_embedded_conduits']::text[], false),
  (49, 9, 'Fixtures and second fix', 'Fixtures', 'Earthing and ELCB / RCCB testing', 'earthing_and_elcb_rccb_testing', 3, ARRAY['electrical_testing_and_functional_checks']::text[], true),
  (50, 9, 'Fixtures and second fix', 'Fixtures', 'Light fittings and false-ceiling closing', 'light_fittings_and_false_ceiling_closing', 3, ARRAY['false_ceiling_and_light_fixtures_where_specified']::text[], false),
  (51, 9, 'Fixtures and second fix', 'Fixtures', 'Sanitaryware, WC and washbasin', 'sanitaryware_wc_and_washbasin', 3, ARRAY['sanitaryware_wc_washbasin_and_bathroom_fittings']::text[], false),
  (52, 9, 'Fixtures and second fix', 'Fixtures', 'CP fittings: taps, mixers, showers', 'cp_fittings_taps_mixers_showers', 3, ARRAY['plumbing_taps_mixers_and_accessories']::text[], false),
  (53, 9, 'Fixtures and second fix', 'Fixtures', 'Kitchen sink and fittings', 'kitchen_sink_and_fittings', 3, ARRAY['kitchen_platform_sink_and_related_fittings']::text[], false),
  (54, 9, 'Fixtures and second fix', 'Fixtures', 'AC indoor units (if applicable)', 'ac_indoor_units_if_applicable', 3, ARRAY['ac_indoor_units_and_other_mep_equipment_where_applicable']::text[], false),
  (55, 10, 'Snagging and handover', 'Handover', 'Electrical and plumbing functional test', 'electrical_and_plumbing_functional_test', 2, ARRAY['plumbing_leak_checks_and_drainage_flow_testing', 'door_window_and_hardware_operation_checks']::text[], false),
  (56, 10, 'Snagging and handover', 'Handover', 'Snag list made', 'snag_list_made', 2, ARRAY['snagging_inspection_and_defect_rectification']::text[], false),
  (57, 10, 'Snagging and handover', 'Handover', 'Snags rectified', 'snags_rectified', 2, ARRAY['sealant_application_and_finishing_corrections']::text[], false),
  (58, 10, 'Snagging and handover', 'Handover', 'Deep cleaning', 'deep_cleaning', 2, ARRAY['deep_cleaning_and_final_handover']::text[], false),
  (59, 10, 'Snagging and handover', 'Handover', 'Floor handed over', 'floor_handed_over', 2, ARRAY[]::text[], true)
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
WHERE t.key = 'post_slab_hybrid_v2'
ON CONFLICT (template_id, step_number) DO UPDATE SET
  phase_number = EXCLUDED.phase_number, phase_name = EXCLUDED.phase_name, phase_stage = EXCLUDED.phase_stage,
  title = EXCLUDED.title, step_key = EXCLUDED.step_key, phase_weight = EXCLUDED.phase_weight,
  alias_keys = EXCLUDED.alias_keys, photo_expected = EXCLUDED.photo_expected;

-- Outside (conventional) (33 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track, base_key)
VALUES ('external_v2', 'Outside (conventional)', 2, TRUE, 'conventional', 'external', 'external_v2')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, version = 2, method = EXCLUDED.method, track = EXCLUDED.track, base_key = EXCLUDED.base_key;
INSERT INTO public.progression_template_steps
  (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key, v.phase_weight, v.alias_keys, v.photo_expected
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Scaffolding and preparation', 'Preparation', 'External scaffolding / gondola erected and certified', 'external_scaffolding_gondola_erected_and_certified', 5, ARRAY[]::text[], true),
  (2, 1, 'Scaffolding and preparation', 'Preparation', 'Façade survey: plumb, level and line marking', 'fac_ade_survey_plumb_level_and_line_marking', 5, ARRAY[]::text[], false),
  (3, 2, 'External plaster', 'External plaster', 'Hacking / bonding coat on RCC', 'hacking_bonding_coat_on_rcc', 20, ARRAY[]::text[], false),
  (4, 2, 'External plaster', 'External plaster', 'Mesh at RCC–masonry joints', 'mesh_at_rcc_masonry_joints', 20, ARRAY[]::text[], false),
  (5, 2, 'External plaster', 'External plaster', 'External plaster (two coats, grooves and drip moulds)', 'external_plaster_two_coats_grooves_and_drip_moulds', 20, ARRAY['external_wall_plaster_and_fac_ade_base_preparation']::text[], false),
  (6, 2, 'External plaster', 'External plaster', 'Plaster curing and line checks', 'plaster_curing_and_line_checks', 20, ARRAY[]::text[], false),
  (7, 3, 'External waterproofing', 'Waterproofing', 'External wall waterproof coating', 'external_wall_waterproof_coating', 15, ARRAY[]::text[], true),
  (8, 3, 'External waterproofing', 'Waterproofing', 'Window and door perimeter sealing (silicone / PU)', 'window_and_door_perimeter_sealing_silicone_pu', 15, ARRAY[]::text[], true),
  (9, 3, 'External waterproofing', 'Waterproofing', 'Terrace slope screed / brick bat coba and waterproofing membrane', 'terrace_slope_screed_brick_bat_coba_and_waterproofing_membrane', 15, ARRAY[]::text[], true),
  (10, 3, 'External waterproofing', 'Waterproofing', 'Terrace ponding test (72 hours)', 'terrace_ponding_test_72_hours', 15, ARRAY[]::text[], true),
  (11, 3, 'External waterproofing', 'Waterproofing', 'Terrace protection screed / china mosaic / tiles', 'terrace_protection_screed_china_mosaic_tiles', 15, ARRAY[]::text[], true),
  (12, 3, 'External waterproofing', 'Waterproofing', 'Parapet coping and drip moulds', 'parapet_coping_and_drip_moulds', 15, ARRAY[]::text[], false),
  (13, 3, 'External waterproofing', 'Waterproofing', 'Overhead water tank waterproofing and leak test', 'overhead_water_tank_waterproofing_and_leak_test', 15, ARRAY[]::text[], true),
  (14, 3, 'External waterproofing', 'Waterproofing', 'Lift pit and basement waterproofing (if applicable)', 'lift_pit_and_basement_waterproofing_if_applicable', 15, ARRAY[]::text[], true),
  (15, 4, 'Façade and elevation', 'Façade', 'Elevation features: fins, louvers, cladding brackets', 'elevation_features_fins_louvers_cladding_brackets', 15, ARRAY[]::text[], false),
  (16, 4, 'Façade and elevation', 'Façade', 'ACP / stone / glass cladding (if specified)', 'acp_stone_glass_cladding_if_specified', 15, ARRAY['external_fac_ade_works_including_plaster_finishes_texture_or_cladding']::text[], false),
  (17, 4, 'Façade and elevation', 'Façade', 'Structural glazing / curtain wall (if specified)', 'structural_glazing_curtain_wall_if_specified', 15, ARRAY[]::text[], false),
  (18, 4, 'Façade and elevation', 'Façade', 'Façade sealant and final inspection', 'fac_ade_sealant_and_final_inspection', 15, ARRAY[]::text[], true),
  (19, 5, 'External painting', 'External paint', 'External primer', 'external_primer', 15, ARRAY[]::text[], false),
  (20, 5, 'External painting', 'External paint', 'Texture / external putty', 'texture_external_putty', 15, ARRAY['external_texture_paint']::text[], false),
  (21, 5, 'External painting', 'External paint', 'External paint coats', 'external_paint_coats', 15, ARRAY[]::text[], false),
  (22, 5, 'External painting', 'External paint', 'Scaffolding removal and touch-ups', 'scaffolding_removal_and_touch_ups', 15, ARRAY[]::text[], false),
  (23, 6, 'External services', 'Services', 'Rainwater down-takes and soil / waste stacks', 'rainwater_down_takes_and_soil_waste_stacks', 15, ARRAY[]::text[], false),
  (24, 6, 'External services', 'Services', 'Plumbing shafts closed and access doors fitted', 'plumbing_shafts_closed_and_access_doors_fitted', 15, ARRAY[]::text[], false),
  (25, 6, 'External services', 'Services', 'Overhead tank piping and pumps', 'overhead_tank_piping_and_pumps', 15, ARRAY[]::text[], false),
  (26, 6, 'External services', 'Services', 'Lightning arrestor and earthing grid', 'lightning_arrestor_and_earthing_grid', 15, ARRAY[]::text[], true),
  (27, 6, 'External services', 'Services', 'External lighting and façade lighting', 'external_lighting_and_fac_ade_lighting', 15, ARRAY[]::text[], false),
  (28, 6, 'External services', 'Services', 'Fire riser / wet riser and hydrant valves (if applicable)', 'fire_riser_wet_riser_and_hydrant_valves_if_applicable', 15, ARRAY[]::text[], false),
  (29, 7, 'Lift and common areas', 'Lift & common', 'Lift machine room / headroom ready', 'lift_machine_room_headroom_ready', 15, ARRAY[]::text[], false),
  (30, 7, 'Lift and common areas', 'Lift & common', 'Lift installation', 'lift_installation', 15, ARRAY[]::text[], false),
  (31, 7, 'Lift and common areas', 'Lift & common', 'Lift load test and licence', 'lift_load_test_and_licence', 15, ARRAY[]::text[], true),
  (32, 7, 'Lift and common areas', 'Lift & common', 'Staircase railings and lobby finishes', 'staircase_railings_and_lobby_finishes', 15, ARRAY[]::text[], false),
  (33, 7, 'Lift and common areas', 'Lift & common', 'Terrace access door, signage and safety railing', 'terrace_access_door_signage_and_safety_railing', 15, ARRAY[]::text[], false)
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
WHERE t.key = 'external_v2'
ON CONFLICT (template_id, step_number) DO UPDATE SET
  phase_number = EXCLUDED.phase_number, phase_name = EXCLUDED.phase_name, phase_stage = EXCLUDED.phase_stage,
  title = EXCLUDED.title, step_key = EXCLUDED.step_key, phase_weight = EXCLUDED.phase_weight,
  alias_keys = EXCLUDED.alias_keys, photo_expected = EXCLUDED.photo_expected;

-- Outside (Mivan) (32 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track, base_key)
VALUES ('external_mivan_v2', 'Outside (Mivan)', 2, TRUE, 'mivan', 'external', 'external_mivan_v2')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, version = 2, method = EXCLUDED.method, track = EXCLUDED.track, base_key = EXCLUDED.base_key;
INSERT INTO public.progression_template_steps
  (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key, v.phase_weight, v.alias_keys, v.photo_expected
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Scaffolding and preparation', 'Preparation', 'External scaffolding / gondola erected and certified', 'external_scaffolding_gondola_erected_and_certified', 5, ARRAY[]::text[], true),
  (2, 1, 'Scaffolding and preparation', 'Preparation', 'Façade survey: plumb, level and line marking', 'fac_ade_survey_plumb_level_and_line_marking', 5, ARRAY[]::text[], false),
  (3, 2, 'RCC surface preparation', 'External base', 'Fin removal and surface repair on façade', 'fin_removal_and_surface_repair_on_fac_ade', 15, ARRAY[]::text[], false),
  (4, 2, 'RCC surface preparation', 'External base', 'Tie-hole and joint sealing on façade', 'tie_hole_and_joint_sealing_on_fac_ade', 15, ARRAY[]::text[], false),
  (5, 2, 'RCC surface preparation', 'External base', 'External texture base on RCC walls (no plaster)', 'external_texture_base_on_rcc_walls_no_plaster', 15, ARRAY['external_texture_base_on_rcc_walls_no_plaster']::text[], false),
  (6, 3, 'External waterproofing', 'Waterproofing', 'External wall waterproof coating', 'external_wall_waterproof_coating', 20, ARRAY[]::text[], true),
  (7, 3, 'External waterproofing', 'Waterproofing', 'Window and door perimeter sealing (silicone / PU)', 'window_and_door_perimeter_sealing_silicone_pu', 20, ARRAY[]::text[], true),
  (8, 3, 'External waterproofing', 'Waterproofing', 'Terrace slope screed / brick bat coba and waterproofing membrane', 'terrace_slope_screed_brick_bat_coba_and_waterproofing_membrane', 20, ARRAY[]::text[], true),
  (9, 3, 'External waterproofing', 'Waterproofing', 'Terrace ponding test (72 hours)', 'terrace_ponding_test_72_hours', 20, ARRAY[]::text[], true),
  (10, 3, 'External waterproofing', 'Waterproofing', 'Terrace protection screed / china mosaic / tiles', 'terrace_protection_screed_china_mosaic_tiles', 20, ARRAY[]::text[], true),
  (11, 3, 'External waterproofing', 'Waterproofing', 'Parapet coping and drip moulds', 'parapet_coping_and_drip_moulds', 20, ARRAY[]::text[], false),
  (12, 3, 'External waterproofing', 'Waterproofing', 'Overhead water tank waterproofing and leak test', 'overhead_water_tank_waterproofing_and_leak_test', 20, ARRAY[]::text[], true),
  (13, 3, 'External waterproofing', 'Waterproofing', 'Lift pit and basement waterproofing (if applicable)', 'lift_pit_and_basement_waterproofing_if_applicable', 20, ARRAY[]::text[], true),
  (14, 4, 'Façade and elevation', 'Façade', 'Elevation features: fins, louvers, cladding brackets', 'elevation_features_fins_louvers_cladding_brackets', 15, ARRAY[]::text[], false),
  (15, 4, 'Façade and elevation', 'Façade', 'ACP / stone / glass cladding (if specified)', 'acp_stone_glass_cladding_if_specified', 15, ARRAY['external_fac_ade_works_including_plaster_finishes_texture_or_cladding']::text[], false),
  (16, 4, 'Façade and elevation', 'Façade', 'Structural glazing / curtain wall (if specified)', 'structural_glazing_curtain_wall_if_specified', 15, ARRAY[]::text[], false),
  (17, 4, 'Façade and elevation', 'Façade', 'Façade sealant and final inspection', 'fac_ade_sealant_and_final_inspection', 15, ARRAY[]::text[], true),
  (18, 5, 'External painting', 'External paint', 'External primer', 'external_primer', 15, ARRAY[]::text[], false),
  (19, 5, 'External painting', 'External paint', 'Texture / external putty', 'texture_external_putty', 15, ARRAY['external_texture_paint']::text[], false),
  (20, 5, 'External painting', 'External paint', 'External paint coats', 'external_paint_coats', 15, ARRAY[]::text[], false),
  (21, 5, 'External painting', 'External paint', 'Scaffolding removal and touch-ups', 'scaffolding_removal_and_touch_ups', 15, ARRAY[]::text[], false),
  (22, 6, 'External services', 'Services', 'Rainwater down-takes and soil / waste stacks', 'rainwater_down_takes_and_soil_waste_stacks', 15, ARRAY[]::text[], false),
  (23, 6, 'External services', 'Services', 'Plumbing shafts closed and access doors fitted', 'plumbing_shafts_closed_and_access_doors_fitted', 15, ARRAY[]::text[], false),
  (24, 6, 'External services', 'Services', 'Overhead tank piping and pumps', 'overhead_tank_piping_and_pumps', 15, ARRAY[]::text[], false),
  (25, 6, 'External services', 'Services', 'Lightning arrestor and earthing grid', 'lightning_arrestor_and_earthing_grid', 15, ARRAY[]::text[], true),
  (26, 6, 'External services', 'Services', 'External lighting and façade lighting', 'external_lighting_and_fac_ade_lighting', 15, ARRAY[]::text[], false),
  (27, 6, 'External services', 'Services', 'Fire riser / wet riser and hydrant valves (if applicable)', 'fire_riser_wet_riser_and_hydrant_valves_if_applicable', 15, ARRAY[]::text[], false),
  (28, 7, 'Lift and common areas', 'Lift & common', 'Lift machine room / headroom ready', 'lift_machine_room_headroom_ready', 15, ARRAY[]::text[], false),
  (29, 7, 'Lift and common areas', 'Lift & common', 'Lift installation', 'lift_installation', 15, ARRAY[]::text[], false),
  (30, 7, 'Lift and common areas', 'Lift & common', 'Lift load test and licence', 'lift_load_test_and_licence', 15, ARRAY[]::text[], true),
  (31, 7, 'Lift and common areas', 'Lift & common', 'Staircase railings and lobby finishes', 'staircase_railings_and_lobby_finishes', 15, ARRAY[]::text[], false),
  (32, 7, 'Lift and common areas', 'Lift & common', 'Terrace access door, signage and safety railing', 'terrace_access_door_signage_and_safety_railing', 15, ARRAY[]::text[], false)
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
WHERE t.key = 'external_mivan_v2'
ON CONFLICT (template_id, step_number) DO UPDATE SET
  phase_number = EXCLUDED.phase_number, phase_name = EXCLUDED.phase_name, phase_stage = EXCLUDED.phase_stage,
  title = EXCLUDED.title, step_key = EXCLUDED.step_key, phase_weight = EXCLUDED.phase_weight,
  alias_keys = EXCLUDED.alias_keys, photo_expected = EXCLUDED.photo_expected;

-- Outside (Hybrid) (32 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track, base_key)
VALUES ('external_hybrid_v2', 'Outside (Hybrid)', 2, TRUE, 'hybrid', 'external', 'external_hybrid_v2')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, version = 2, method = EXCLUDED.method, track = EXCLUDED.track, base_key = EXCLUDED.base_key;
INSERT INTO public.progression_template_steps
  (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key, v.phase_weight, v.alias_keys, v.photo_expected
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Scaffolding and preparation', 'Preparation', 'External scaffolding / gondola erected and certified', 'external_scaffolding_gondola_erected_and_certified', 5, ARRAY[]::text[], true),
  (2, 1, 'Scaffolding and preparation', 'Preparation', 'Façade survey: plumb, level and line marking', 'fac_ade_survey_plumb_level_and_line_marking', 5, ARRAY[]::text[], false),
  (3, 2, 'RCC surface preparation', 'External base', 'Fin removal and surface repair on façade', 'fin_removal_and_surface_repair_on_fac_ade', 15, ARRAY[]::text[], false),
  (4, 2, 'RCC surface preparation', 'External base', 'Tie-hole and joint sealing on façade', 'tie_hole_and_joint_sealing_on_fac_ade', 15, ARRAY[]::text[], false),
  (5, 2, 'RCC surface preparation', 'External base', 'External texture base on RCC walls (no plaster)', 'external_texture_base_on_rcc_walls_no_plaster', 15, ARRAY['external_texture_base_on_rcc_walls_no_plaster']::text[], false),
  (6, 3, 'External waterproofing', 'Waterproofing', 'External wall waterproof coating', 'external_wall_waterproof_coating', 20, ARRAY[]::text[], true),
  (7, 3, 'External waterproofing', 'Waterproofing', 'Window and door perimeter sealing (silicone / PU)', 'window_and_door_perimeter_sealing_silicone_pu', 20, ARRAY[]::text[], true),
  (8, 3, 'External waterproofing', 'Waterproofing', 'Terrace slope screed / brick bat coba and waterproofing membrane', 'terrace_slope_screed_brick_bat_coba_and_waterproofing_membrane', 20, ARRAY[]::text[], true),
  (9, 3, 'External waterproofing', 'Waterproofing', 'Terrace ponding test (72 hours)', 'terrace_ponding_test_72_hours', 20, ARRAY[]::text[], true),
  (10, 3, 'External waterproofing', 'Waterproofing', 'Terrace protection screed / china mosaic / tiles', 'terrace_protection_screed_china_mosaic_tiles', 20, ARRAY[]::text[], true),
  (11, 3, 'External waterproofing', 'Waterproofing', 'Parapet coping and drip moulds', 'parapet_coping_and_drip_moulds', 20, ARRAY[]::text[], false),
  (12, 3, 'External waterproofing', 'Waterproofing', 'Overhead water tank waterproofing and leak test', 'overhead_water_tank_waterproofing_and_leak_test', 20, ARRAY[]::text[], true),
  (13, 3, 'External waterproofing', 'Waterproofing', 'Lift pit and basement waterproofing (if applicable)', 'lift_pit_and_basement_waterproofing_if_applicable', 20, ARRAY[]::text[], true),
  (14, 4, 'Façade and elevation', 'Façade', 'Elevation features: fins, louvers, cladding brackets', 'elevation_features_fins_louvers_cladding_brackets', 15, ARRAY[]::text[], false),
  (15, 4, 'Façade and elevation', 'Façade', 'ACP / stone / glass cladding (if specified)', 'acp_stone_glass_cladding_if_specified', 15, ARRAY['external_fac_ade_works_including_plaster_finishes_texture_or_cladding']::text[], false),
  (16, 4, 'Façade and elevation', 'Façade', 'Structural glazing / curtain wall (if specified)', 'structural_glazing_curtain_wall_if_specified', 15, ARRAY[]::text[], false),
  (17, 4, 'Façade and elevation', 'Façade', 'Façade sealant and final inspection', 'fac_ade_sealant_and_final_inspection', 15, ARRAY[]::text[], true),
  (18, 5, 'External painting', 'External paint', 'External primer', 'external_primer', 15, ARRAY[]::text[], false),
  (19, 5, 'External painting', 'External paint', 'Texture / external putty', 'texture_external_putty', 15, ARRAY['external_texture_paint']::text[], false),
  (20, 5, 'External painting', 'External paint', 'External paint coats', 'external_paint_coats', 15, ARRAY[]::text[], false),
  (21, 5, 'External painting', 'External paint', 'Scaffolding removal and touch-ups', 'scaffolding_removal_and_touch_ups', 15, ARRAY[]::text[], false),
  (22, 6, 'External services', 'Services', 'Rainwater down-takes and soil / waste stacks', 'rainwater_down_takes_and_soil_waste_stacks', 15, ARRAY[]::text[], false),
  (23, 6, 'External services', 'Services', 'Plumbing shafts closed and access doors fitted', 'plumbing_shafts_closed_and_access_doors_fitted', 15, ARRAY[]::text[], false),
  (24, 6, 'External services', 'Services', 'Overhead tank piping and pumps', 'overhead_tank_piping_and_pumps', 15, ARRAY[]::text[], false),
  (25, 6, 'External services', 'Services', 'Lightning arrestor and earthing grid', 'lightning_arrestor_and_earthing_grid', 15, ARRAY[]::text[], true),
  (26, 6, 'External services', 'Services', 'External lighting and façade lighting', 'external_lighting_and_fac_ade_lighting', 15, ARRAY[]::text[], false),
  (27, 6, 'External services', 'Services', 'Fire riser / wet riser and hydrant valves (if applicable)', 'fire_riser_wet_riser_and_hydrant_valves_if_applicable', 15, ARRAY[]::text[], false),
  (28, 7, 'Lift and common areas', 'Lift & common', 'Lift machine room / headroom ready', 'lift_machine_room_headroom_ready', 15, ARRAY[]::text[], false),
  (29, 7, 'Lift and common areas', 'Lift & common', 'Lift installation', 'lift_installation', 15, ARRAY[]::text[], false),
  (30, 7, 'Lift and common areas', 'Lift & common', 'Lift load test and licence', 'lift_load_test_and_licence', 15, ARRAY[]::text[], true),
  (31, 7, 'Lift and common areas', 'Lift & common', 'Staircase railings and lobby finishes', 'staircase_railings_and_lobby_finishes', 15, ARRAY[]::text[], false),
  (32, 7, 'Lift and common areas', 'Lift & common', 'Terrace access door, signage and safety railing', 'terrace_access_door_signage_and_safety_railing', 15, ARRAY[]::text[], false)
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
WHERE t.key = 'external_hybrid_v2'
ON CONFLICT (template_id, step_number) DO UPDATE SET
  phase_number = EXCLUDED.phase_number, phase_name = EXCLUDED.phase_name, phase_stage = EXCLUDED.phase_stage,
  title = EXCLUDED.title, step_key = EXCLUDED.step_key, phase_weight = EXCLUDED.phase_weight,
  alias_keys = EXCLUDED.alias_keys, photo_expected = EXCLUDED.photo_expected;

-- Site works (15 steps)
INSERT INTO public.progression_templates (key, name, version, is_active, method, track, base_key)
VALUES ('site_v2', 'Site works', 2, TRUE, 'conventional', 'site', 'site_v2')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, version = 2, method = EXCLUDED.method, track = EXCLUDED.track, base_key = EXCLUDED.base_key;
INSERT INTO public.progression_template_steps
  (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key, v.phase_weight, v.alias_keys, v.photo_expected
FROM public.progression_templates t,
(VALUES
  (1, 1, 'Utilities', 'Utilities', 'External drainage lines and manholes', 'external_drainage_lines_and_manholes', 30, ARRAY[]::text[], false),
  (2, 1, 'Utilities', 'Utilities', 'STP / septic tank', 'stp_septic_tank', 30, ARRAY[]::text[], false),
  (3, 1, 'Utilities', 'Utilities', 'Underground water tank', 'underground_water_tank', 30, ARRAY[]::text[], true),
  (4, 1, 'Utilities', 'Utilities', 'Rainwater harvesting pits', 'rainwater_harvesting_pits', 30, ARRAY[]::text[], false),
  (5, 1, 'Utilities', 'Utilities', 'Power substation / transformer and DG set', 'power_substation_transformer_and_dg_set', 30, ARRAY[]::text[], false),
  (6, 2, 'Hardscape', 'Hardscape', 'Compound wall and gate', 'compound_wall_and_gate', 30, ARRAY[]::text[], false),
  (7, 2, 'Hardscape', 'Hardscape', 'Internal roads and kerbs', 'internal_roads_and_kerbs', 30, ARRAY[]::text[], false),
  (8, 2, 'Hardscape', 'Hardscape', 'Paving and parking marking', 'paving_and_parking_marking', 30, ARRAY[]::text[], false),
  (9, 3, 'Softscape and amenities', 'Amenities', 'Landscaping and plantation', 'landscaping_and_plantation', 20, ARRAY[]::text[], false),
  (10, 3, 'Softscape and amenities', 'Amenities', 'Amenities: clubhouse, play area (if any)', 'amenities_clubhouse_play_area_if_any', 20, ARRAY[]::text[], false),
  (11, 3, 'Softscape and amenities', 'Amenities', 'Site lighting', 'site_lighting', 20, ARRAY[]::text[], false),
  (12, 4, 'Statutory and handover', 'Handover', 'Fire NOC', 'fire_noc', 20, ARRAY[]::text[], true),
  (13, 4, 'Statutory and handover', 'Handover', 'Lift licences', 'lift_licences', 20, ARRAY[]::text[], true),
  (14, 4, 'Statutory and handover', 'Handover', 'Occupancy Certificate', 'occupancy_certificate', 20, ARRAY[]::text[], true),
  (15, 4, 'Statutory and handover', 'Handover', 'Society / owner handover', 'society_owner_handover', 20, ARRAY[]::text[], true)
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
WHERE t.key = 'site_v2'
ON CONFLICT (template_id, step_number) DO UPDATE SET
  phase_number = EXCLUDED.phase_number, phase_name = EXCLUDED.phase_name, phase_stage = EXCLUDED.phase_stage,
  title = EXCLUDED.title, step_key = EXCLUDED.step_key, phase_weight = EXCLUDED.phase_weight,
  alias_keys = EXCLUDED.alias_keys, photo_expected = EXCLUDED.photo_expected;


-- ---------------------------------------------------------------------------
-- Move / keep a project on v2
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_progression_v2(p_project UUID, p_actor UUID DEFAULT NULL)
RETURNS TABLE (created INT, switched INT, carried INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_method TEXT;
  r            RECORD;
  v_key        TEXT;
  v_template   UUID;
  v_active     RECORD;
  v_has_active BOOLEAN;
  v_new        UUID;
  v_created    INT := 0;
  v_switched   INT := 0;
  v_carried    INT := 0;
  v_n          INT;
BEGIN
  SELECT COALESCE(construction_method, 'conventional') INTO v_project_method FROM public.projects WHERE id = p_project;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.projects SET progression_version = 2 WHERE id = p_project;

  FOR r IN
    -- Inside: every floor x structure / finishing
    SELECT f.id AS floor_id, b.id AS building_id, t.track,
           COALESCE(f.construction_method, b.construction_method, v_project_method) AS method
      FROM public.floors f JOIN public.buildings b ON b.id = f.building_id
     CROSS JOIN (VALUES ('pre_slab'), ('post_slab')) AS t(track)
     WHERE b.project_id = p_project AND b.deleted_at IS NULL AND f.deleted_at IS NULL
    UNION ALL
    -- Outside: every building
    SELECT NULL::uuid, b.id, 'external', COALESCE(b.construction_method, v_project_method)
      FROM public.buildings b WHERE b.project_id = p_project AND b.deleted_at IS NULL
    UNION ALL
    -- Site works: the project
    SELECT NULL::uuid, NULL::uuid, 'site', v_project_method
  LOOP
    v_key := CASE
      WHEN r.track = 'site' THEN 'site_v2'
      WHEN r.method = 'conventional' THEN r.track || '_v2'
      ELSE r.track || '_' || r.method || '_v2' END;
    v_template := NULL;
    -- A project's own (edited) copy wins over the BuildView list.
    SELECT id INTO v_template FROM public.progression_templates
     WHERE base_key = v_key AND project_id = p_project AND is_active LIMIT 1;
    IF v_template IS NULL THEN
      SELECT id INTO v_template FROM public.progression_templates
       WHERE key = v_key AND project_id IS NULL AND is_active LIMIT 1;
    END IF;
    IF v_template IS NULL THEN CONTINUE; END IF;

    SELECT * INTO v_active FROM public.project_progressions pp
     WHERE pp.project_id = p_project AND pp.track = r.track AND pp.deleted_at IS NULL
       AND ((r.track IN ('pre_slab', 'post_slab') AND pp.floor_id = r.floor_id)
         OR (r.track = 'external' AND pp.building_id = r.building_id)
         OR r.track = 'site')
     LIMIT 1;
    v_has_active := FOUND;

    IF v_has_active THEN
      IF v_active.template_id = v_template THEN
        -- Same list: add any steps the (edited) list gained since.
        INSERT INTO public.project_progression_steps (progression_id, template_step_id, step_number, status, source)
        SELECT v_active.id, ts.id, ts.step_number, 'pending', 'manual'
          FROM public.progression_template_steps ts
         WHERE ts.template_id = v_template AND ts.hidden_at IS NULL
           AND NOT EXISTS (SELECT 1 FROM public.project_progression_steps x
                            WHERE x.progression_id = v_active.id AND x.template_step_id = ts.id);
        CONTINUE;
      END IF;
      UPDATE public.project_progressions SET deleted_at = NOW(), deleted_by = p_actor WHERE id = v_active.id;
    END IF;

    INSERT INTO public.project_progressions
      (project_id, floor_id, building_id, template_id, track, planned_start_date, planned_end_date, created_by, updated_by)
    VALUES (p_project, r.floor_id, r.building_id, v_template, r.track,
            CASE WHEN v_has_active THEN v_active.planned_start_date END,
            CASE WHEN v_has_active THEN v_active.planned_end_date END, p_actor, p_actor)
    RETURNING id INTO v_new;

    -- Carry over: a step is done when every old step it replaces was done
    -- (matched by step key or alias); in progress when any was started.
    INSERT INTO public.project_progression_steps
      (progression_id, template_step_id, step_number, status,
       started_at, started_by, ended_at, ended_by, completed_at, completed_by,
       work_date, note, evidence_tour_id, evidence_note,
       verification_status, verified_by, verified_at, verification_note, source)
    SELECT v_new, ts.id, ts.step_number,
           CASE WHEN o.n = 0 THEN 'pending'
                WHEN o.n_done = o.n THEN 'completed'
                WHEN o.n_active > 0 THEN 'in_progress'
                ELSE 'pending' END,
           CASE WHEN o.n_active > 0 THEN o.started_at END,
           CASE WHEN o.n_active > 0 THEN o.started_by END,
           CASE WHEN o.n > 0 AND o.n_done = o.n THEN o.ended_at END,
           CASE WHEN o.n > 0 AND o.n_done = o.n THEN o.ended_by END,
           CASE WHEN o.n > 0 AND o.n_done = o.n THEN o.ended_at END,
           CASE WHEN o.n > 0 AND o.n_done = o.n THEN o.ended_by END,
           CASE WHEN o.n > 0 AND o.n_done = o.n THEN o.work_date END,
           o.note, o.evidence_tour_id, NULL,
           CASE WHEN o.n > 0 AND o.n_done = o.n AND o.n_verified = o.n THEN 'verified' END,
           CASE WHEN o.n > 0 AND o.n_done = o.n AND o.n_verified = o.n THEN o.verified_by END,
           CASE WHEN o.n > 0 AND o.n_done = o.n AND o.n_verified = o.n THEN o.verified_at END,
           NULL, 'manual'
      FROM public.progression_template_steps ts
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS n,
               COUNT(*) FILTER (WHERE s.status = 'completed') AS n_done,
               COUNT(*) FILTER (WHERE s.status <> 'pending') AS n_active,
               COUNT(*) FILTER (WHERE s.verification_status = 'verified') AS n_verified,
               MIN(s.started_at) AS started_at,
               (ARRAY_AGG(s.started_by ORDER BY s.started_at) FILTER (WHERE s.started_by IS NOT NULL))[1] AS started_by,
               MAX(COALESCE(s.ended_at, s.completed_at)) AS ended_at,
               (ARRAY_AGG(COALESCE(s.ended_by, s.completed_by) ORDER BY COALESCE(s.ended_at, s.completed_at) DESC NULLS LAST))[1] AS ended_by,
               MAX(s.work_date) AS work_date,
               (ARRAY_AGG(s.note) FILTER (WHERE s.note IS NOT NULL))[1] AS note,
               (ARRAY_AGG(s.evidence_tour_id) FILTER (WHERE s.evidence_tour_id IS NOT NULL))[1] AS evidence_tour_id,
               (ARRAY_AGG(s.verified_by) FILTER (WHERE s.verified_by IS NOT NULL))[1] AS verified_by,
               MAX(s.verified_at) AS verified_at
          FROM public.project_progression_steps s
          JOIN public.progression_template_steps ots ON ots.id = s.template_step_id
         WHERE v_has_active AND s.progression_id = v_active.id
           AND (ots.step_key = ts.step_key OR ots.step_key = ANY (ts.alias_keys))
      ) o ON TRUE
     WHERE ts.template_id = v_template AND ts.hidden_at IS NULL;

    IF v_has_active THEN
      v_switched := v_switched + 1;
      SELECT COUNT(*) INTO v_n FROM public.project_progression_steps WHERE progression_id = v_new AND status <> 'pending';
      v_carried := v_carried + v_n;
    ELSE
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_created, v_switched, v_carried;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_progression_v2(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_progression_v2(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';

-- Check: v2 templates and their step counts (10 rows).
SELECT t.key, t.track, COUNT(s.id) AS steps
  FROM public.progression_templates t
  JOIN public.progression_template_steps s ON s.template_id = t.id
 WHERE t.version = 2 AND t.project_id IS NULL
 GROUP BY t.key, t.track ORDER BY t.key;
