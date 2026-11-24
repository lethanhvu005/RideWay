# Feature Specification: F02 — Operators, Vehicles & Layouts

**Feature Branch**: `003-f02-operators-vehicles-layouts`
**Created**: 2026-11-24
**Status**: Draft
**Input**: SRS v0.4 (`FR-03, FR-13`) & SRS v0.3 (`O-01, O-02, A-02, WF-05`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operator Fleet & 2-Deck Layout Management (Priority: P0)
An operator owner signs into the Operator Portal (`O-01`, `O-02`, `WF-05`) to register vehicles (Limousine 20–22 cabins, sleeper buses 24–34 beds) and configure 1- or 2-deck seat/cabin layouts with per-unit capacity.

**Independent Test**: Create a vehicle and a 2-deck layout template under Operator A; verify capacity rules and verify Operator B cannot view or edit them.

**Acceptance Scenarios**:
1. **Given** an authenticated `Operator owner`, **When** they create a 20-cabin Limousine layout with floor/row/column positions and unit types, **Then** the layout is saved under their `operator_id` and ready for trip assignment.
2. **Given** an `Operator staff` without fleet management permission, **When** they attempt to edit layouts or vehicles, **Then** access is denied.

### Edge Cases
- Scope of `2 adults + 1 child` vs `1 adult + 1 child` across all vehicle/unit types: [NEEDS CLARIFICATION: OPEN-01/R-07 — Confirm which unit types beyond double Limousine cabins allow 2 adults + 1 child vs 1 adult + 1 child].

## Requirements *(mandatory)*

### Functional Requirements
- **FR-03** *(P0)*: Operators MUST be able to self-manage their vehicles and 1-/2-deck seat/cabin layouts (`O-02`).
- **FR-13** *(P0)*: System MUST provide an Operator Dashboard (`O-01`, `WF-05`) and Admin Operator Management (`A-02`) scoped by permissions.

### Key Entities
- **VehicleType & Vehicle**: Vehicle classification, plate number, status, owned by `Operator`.
- **SeatLayout & LayoutUnit**: Multi-deck layout templates and individual units with floor, grid coordinates, unit type, and adult/child capacities.

## Success Criteria *(mandatory)*
- **SC-001**: Operators can configure a full 2-deck vehicle layout and assign it to trips with 100% tenant isolation (`C-02`).

## Assumptions
- Vehicle categories follow confirmed groups: Limousine 20–22 cabins and sleeper 24–34 beds.
