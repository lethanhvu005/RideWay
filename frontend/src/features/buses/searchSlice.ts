import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type TransportModeTab = 'BUS' | 'FLIGHT' | 'TRAIN' | 'RENTAL';
export type VehicleKindFilter = 'ALL' | 'LIMO' | 'SLEEPER';
export type TimeSlotFilter = 'ALL' | 'EARLY' | 'MORNING' | 'AFTERNOON' | 'NIGHT';

export interface SearchFilterState {
  activeServiceTab: TransportModeTab;
  fromLocationId: string;
  toLocationId: string;
  dateQuery: string;
  segmentIdx: number;
  sortBy: string;
  filterVehicleKind: VehicleKindFilter;
  filterOperatorId: string;
  filterTimeSlot: TimeSlotFilter;
}

const initialState: SearchFilterState = {
  activeServiceTab: 'BUS',
  fromLocationId: '',
  toLocationId: '',
  dateQuery: '',
  segmentIdx: 2,
  sortBy: 'price_asc',
  filterVehicleKind: 'ALL',
  filterOperatorId: 'ALL',
  filterTimeSlot: 'ALL',
};

export const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setActiveServiceTab(state, action: PayloadAction<TransportModeTab>) {
      state.activeServiceTab = action.payload;
    },
    setFromLocationId(state, action: PayloadAction<string>) {
      state.fromLocationId = action.payload;
    },
    setToLocationId(state, action: PayloadAction<string>) {
      state.toLocationId = action.payload;
    },
    swapSearchLocations(state) {
      const temp = state.fromLocationId;
      state.fromLocationId = state.toLocationId;
      state.toLocationId = temp;
    },
    setDateQuery(state, action: PayloadAction<string>) {
      state.dateQuery = action.payload;
    },
    setSegmentIdx(state, action: PayloadAction<number>) {
      state.segmentIdx = action.payload;
    },
    setSortBy(state, action: PayloadAction<string>) {
      state.sortBy = action.payload;
    },
    setFilterVehicleKind(state, action: PayloadAction<VehicleKindFilter>) {
      state.filterVehicleKind = action.payload;
    },
    setFilterOperatorId(state, action: PayloadAction<string>) {
      state.filterOperatorId = action.payload;
    },
    setFilterTimeSlot(state, action: PayloadAction<TimeSlotFilter>) {
      state.filterTimeSlot = action.payload;
    },
    resetBusFilters(state) {
      state.sortBy = 'price_asc';
      state.filterVehicleKind = 'ALL';
      state.filterOperatorId = 'ALL';
      state.filterTimeSlot = 'ALL';
      state.dateQuery = '';
    },
  },
});

export const {
  setActiveServiceTab,
  setFromLocationId,
  setToLocationId,
  swapSearchLocations,
  setDateQuery,
  setSegmentIdx,
  setSortBy,
  setFilterVehicleKind,
  setFilterOperatorId,
  setFilterTimeSlot,
  resetBusFilters,
} = searchSlice.actions;

export default searchSlice.reducer;
