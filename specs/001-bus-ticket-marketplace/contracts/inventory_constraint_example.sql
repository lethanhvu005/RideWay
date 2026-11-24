-- DỰ THẢO SQL kiểm soát tồn chỗ, cần đối chiếu migration Django trước khi chạy.
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- Django's IntegerRangeField maps to PostgreSQL int4range.
-- Migration from Django ExclusionConstraint should generate a compatible clause:
ALTER TABLE inventory_allocations
  ADD CONSTRAINT exclude_active_unit_sections_sql
  EXCLUDE USING gist (trip_unit_id WITH =, section WITH &&)
  WHERE (status IN ('HELD','CONFIRMED','BLOCKED'));

-- Run only if constraint above is NOT already installed by Django migrations.
-- ADDITIONAL safety checks if the business service requires them:
ALTER TABLE inventory_allocations
  ADD CONSTRAINT ck_allocation_section_nonempty
  CHECK (NOT isempty(section) AND NOT lower_inf(section) AND NOT upper_inf(section));
-- Never put NOW() into the partial constraint predicate.
