import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import searchReducer from '../features/buses/searchSlice';
import bookingReducer from '../features/booking/bookingSlice';
import { ridewayApi } from '../services/ridewayApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    search: searchReducer,
    bookingFlow: bookingReducer,
    [ridewayApi.reducerPath]: ridewayApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(ridewayApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
