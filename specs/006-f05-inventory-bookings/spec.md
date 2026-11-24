# Feature Specification: F05 — Inventory & Bookings

**Feature Branch**: `006-f05-inventory-bookings`
**Created**: 2026-11-24
**Status**: Draft
**Input**: SRS v0.4 (`FR-08, FR-09, FR-10`) & SRS v0.3 (`P-03, P-05, O-04, WF-03, WF-04`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Atomic Multi-Unit 10-Minute Hold & Segment Conflict Prevention (Priority: P0)
An authenticated customer selects one or more units for a segment `[from_sequence, to_sequence)` (`P-03`, `WF-03`) and creates an atomic all-or-nothing 10-minute hold (`expires_at` issued by Backend).

**Independent Test**: Run `T01`, `T02`, `T03`, `T04` (concurrent overlapping holds, adjacent A→B + B→C holds, 3-unit partial conflict rollback, expired hold reclamation).

**Acceptance Scenarios**:
1. **Given** unit P01 is available on A→C, **When** two customers concurrently hold P01 on A→C, **Then** only one succeeds and the other receives a conflict (`409`) (`T01`).
2. **Given** unit P01 is held/confirmed on A→B, **When** another customer holds P01 on B→C, **Then** both succeed (`T02`).
3. **Given** a customer holds 3 units where 1 unit conflicts, **When** submitted, **Then** zero units are held (full rollback) (`T03`).
4. **Given** a 10-minute hold has expired before background cleanup runs, **When** a new hold arrives, **Then** the expired hold is transitioned to `EXPIRED` inside the transaction before re-allocation (`T04`).

### User Story 2 - Passenger Assignment, Capacity Validation & Price/Policy Snapshot (Priority: P0)
The customer enters passenger details (`P-05`, `WF-04`), assigns passengers to each held unit within capacity limits, and receives a backend-computed quote snapshotting fares, surcharges, and effective policy version.

**Acceptance Scenarios**:
1. **Given** a double cabin (`2 adults + 1 child`), **When** 3 adults are assigned, **Then** the request is rejected (`T08`).
2. **Given** `2 adults + 1 child` assigned when child surcharge is unconfigured, **When** quoting, **Then** the system returns `422` and does NOT assume `0` (`T09`).
3. **Given** a client modifies price fields in the request, **When** processed, **Then** Backend ignores client prices and recalculates from authoritative fares (`T11`).

### Edge Cases
- Child age threshold, verification, and surcharge formula: [NEEDS CLARIFICATION: OPEN-01, OPEN-02 — Define maximum child age, birth-date/ID requirements, and child surcharge calculation method].

## Requirements *(mandatory)*

### Functional Requirements
- **FR-08** *(P0)*: System MUST execute atomic all-or-nothing multi-unit holds for 10 minutes using segment intervals `[from_sequence, to_sequence)` and reclaim expired holds in-transaction (`C-03`, `C-04`).
- **FR-09** *(P0)*: System MUST validate per-unit passenger capacity and assign each passenger to a specific `BookingItem` (`P-05`).
- **FR-10** *(P0)*: System MUST snapshot unit fares, surcharges, pickup fees, and effective `policy_versions` onto the booking, ignoring client-supplied prices.

### Key Entities
- **InventoryAllocation**: Tracks `trip_unit_id`, `section` (`[from_sequence, to_sequence)`), state (`HELD`, `CONFIRMED`, `BLOCKED`, `EXPIRED`, `RELEASED`), and `expires_at`.
- **Booking, BookingItem, BookingPassenger & BookingItemPassenger**: Order header, booked units, passenger records, and per-unit assignments.

## Success Criteria *(mandatory)*
- **SC-001**: Zero overlapping segment double-bookings across concurrent transactions (`C-03`).
- **SC-002**: 100% atomic rollback on partial multi-unit conflicts (`C-04`).
