import { configureStore } from '@reduxjs/toolkit';

import { bookingReducer } from '@/features/booking/model';
export const makeStore = () =>
  configureStore({
    reducer: { booking: bookingReducer },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
