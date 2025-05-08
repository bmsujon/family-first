import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import familyReducer from '../features/family/familySlice';
import taskReducer from '../features/tasks/taskSlice';
import notificationReducer from './notificationSlice';
import { apiSlice } from '../features/api/apiSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        family: familyReducer,
        tasks: taskReducer,
        notification: notificationReducer,
        [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware().concat(apiSlice.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;