-- ================================================
-- EXPORT COMPLETE SUPABASE SCHEMA
-- ================================================
-- Run this in Supabase SQL Editor to export EVERYTHING
-- Copy the output and save it as our source of truth

-- ================================================
-- PART 1: EXPORT ALL TABLES WITH COLUMNS
-- ================================================
SELECT 
  'TABLE: ' || table_name as object_type,
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ================================================
-- PART 2: EXPORT ALL FOREIGN KEYS
-- ================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ================================================
-- PART 3: EXPORT ALL INDEXES
-- ================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ================================================
-- PART 4: EXPORT ALL RLS POLICIES
-- ================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================
-- PART 5: EXPORT ALL FUNCTIONS
-- ================================================
SELECT
  routine_name,
  routine_type,
  data_type,
  routine_definition,
  external_language
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ================================================
-- PART 6: EXPORT ALL TRIGGERS
-- ================================================
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_orientation,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ================================================
-- PART 7: EXPORT ALL VIEWS
-- ================================================
SELECT
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ================================================
-- PART 8: CHECK ROW COUNTS
-- ================================================
DO $$
DECLARE
  r RECORD;
  count_result INTEGER;
BEGIN
  RAISE NOTICE 'TABLE ROW COUNTS:';
  RAISE NOTICE '=================';
  
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I', r.tablename) INTO count_result;
    RAISE NOTICE '% : % rows', r.tablename, count_result;
  END LOOP;
END $$;