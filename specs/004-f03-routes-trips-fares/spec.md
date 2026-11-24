# Feature Specification: F03 — Routes, Trips & Fares

**Feature Branch**: `004-f03-routes-trips-fares`
**Created**: 2026-11-24
**Status**: Draft
**Input**: SRS v0.4 (`FR-04, FR-05, FR-19`) & SRS v0.3 (`O-03`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Route, Ordered Stops, Trip Schedule & Segment Fares (Priority: P0)
An operator defines routes with ordered stops, schedules trips (snapshotting `trip_units` from vehicle layouts), configures boarding/alighting per stop, and sets fares per `[from_stop, to_stop]` segment and unit type (`O-03`).

**Independent Test**: Create a 4-stop route A–B–C–D, schedule a trip, set segment fares (A→C, A→B, B→C), and verify cross-operator route/vehicle assignment is rejected.

**Acceptance Scenarios**:
1. **Given** Operator A creates a trip using Operator A's route and vehicle, **When** the trip is saved, **Then** `trip_stops` and `trip_units` are snapshotted for that trip.
2. **Given** Operator A attempts to create a trip referencing Operator B's route or vehicle, **When** submitted, **Then** the system rejects the cross-tenant reference.

### User Story 2 - Fixed & Custom Pickup/Dropoff Options (Priority: P1)
Operators configure fixed pickup/dropoff points and rules for customer-entered addresses (`FR-19`).

**Acceptance Scenarios**:
1. **Given** a customer enters a custom pickup address where operator zone/fee rules are not yet configured, **When** quoting, **Then** the system MUST NOT guess a fee or confirm pickup (`T10`).

### Edge Cases
- Custom pickup/dropoff surcharge rules, service zones, and operator confirmation SLA: [NEEDS CLARIFICATION: OPEN-07 — Define zone rules, surcharge pricing, and confirmation deadline for custom pickup/dropoff addresses].

## Requirements *(mandatory)*

### Functional Requirements
- **FR-04** *(P0)*: Operators MUST be able to manage routes, ordered stops, trip schedules, and fixed pickup/dropoff points (`O-03`).
- **FR-05** *(P0)*: Operators MUST be able to define fares per segment and unit type.
- **FR-19** *(P1)*: System MUST support customer-entered pickup/dropoff addresses only with explicit operator acceptance rules and approved surcharge fees.

### Key Entities
- **Location, Route & RouteStop**: Geographic points and ordered stop sequences.
- **Trip, TripStop, TripUnit, TripFare & PickupOption**: Scheduled trips, stop timestamps/permissions, snapshotted units, segment prices, and pickup/dropoff options.

## Success Criteria *(mandatory)*
- **SC-001**: 100% of trips snapshot their `trip_stops` and `trip_units` independently of future template edits.
- **SC-002**: 100% of cross-operator route/vehicle bindings are blocked.
