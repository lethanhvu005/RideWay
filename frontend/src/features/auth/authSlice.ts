import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserProfile } from '../../types/models';

interface AuthState {
  user: UserProfile | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  initialized: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthUser(state, action: PayloadAction<UserProfile | null>) {
      state.user = action.payload;
      state.initialized = true;
    },
    clearAuthUser(state) {
      state.user = null;
      state.initialized = true;
    },
  },
});

export const { setAuthUser, clearAuthUser } = authSlice.actions;
export default authSlice.reducer;
