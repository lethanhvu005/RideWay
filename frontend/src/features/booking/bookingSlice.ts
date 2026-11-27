import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ActiveHoldBooking } from '../../components/CheckoutFlowModal';

interface BookingFlowState {
  lastHold: ActiveHoldBooking | null;
  lastTripId: string | null;
}

const initialState: BookingFlowState = {
  lastHold: null,
  lastTripId: null,
};

export const bookingSlice = createSlice({
  name: 'bookingFlow',
  initialState,
  reducers: {
    setLastHold(state, action: PayloadAction<ActiveHoldBooking | null>) {
      state.lastHold = action.payload;
    },
    setLastTripId(state, action: PayloadAction<string | null>) {
      state.lastTripId = action.payload;
    },
  },
});

export const { setLastHold, setLastTripId } = bookingSlice.actions;
export default bookingSlice.reducer;
