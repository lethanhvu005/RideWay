# Feature Specification: F04 — Customer Search & UI

**Feature Branch**: `005-f04-customer-search-ui`
**Created**: 2026-11-24
**Status**: Draft
**Input**: SRS v0.4 (`FR-06, FR-07, FR-16`) & SRS v0.3 (`P-01, P-02, P-03, P-09, P-10, WF-01, WF-02, WF-03`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search Trips, Filter Cheap Tickets & Inspect 2-Deck Layout (Priority: P0)
A visitor searches trips by origin, destination, and date (`P-01`, `WF-01`), filters and sorts by lowest valid segment price (`P-02`, `WF-02`), and opens trip details (`P-03`, `WF-03`) to view the 2-deck room/bed layout and real-time availability for their selected segment.

**Independent Test**: Search a route with multiple operators/unit types, sort by lowest valid price for segment A→C, and inspect the 2-deck layout showing available vs held/booked units.

**Acceptance Scenarios**:
1. **Given** trips with different segment fares, **When** the customer sorts by lowest price, **Then** results are ordered by the actual lowest valid segment price for the requested date and segment.
2. **Given** a trip with 2 decks, **When** the customer views `P-03`, **Then** each unit displays floor, position, price, and availability using both color and clear text/icon indicators (`C-07`).

### User Story 2 - Public Operator Profiles, Travel News & Destinations (Priority: P1)
Visitors browse operator profiles (`P-09`) and published travel news, destination guides, and promotions (`P-10`).

**Acceptance Scenarios**:
1. **Given** a draft CMS article, **When** a public visitor browses `P-10`, **Then** draft articles are hidden and only published articles appear.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-06** *(P0)*: Customers MUST be able to search trips and sort/filter by lowest valid segment price (`P-01`, `P-02`).
- **FR-07** *(P0)*: Customers MUST be able to view 2-deck seat/cabin layouts, unit positions, segment prices, and real-time availability (`P-03`).
- **FR-16** *(P1)*: Public UI MUST display travel articles, destinations, operator news, and promotions (`P-09`, `P-10`).

### Key Entities
- **Trip, TripUnit & TripFare**: Publicly searchable trip schedules, units, and segment fares.
- **Post & Destination**: Published travel content and destination guides.

## Success Criteria *(mandatory)*
- **SC-001**: All customer screens use the Vé Xuyên Việt desktop-first white & green palette (`#FFFFFF`, `#166534`, `#16A34A`, `#F0FDF4`) with loading, error, and empty states (`C-07`).

## Assumptions
- Layout rhythm is inspired by MONA Tour without copying logos, images, source code, or proprietary assets.
