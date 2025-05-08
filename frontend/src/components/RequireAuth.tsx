import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { RootState } from '../store/store';
import { Box, CircularProgress } from '@mui/material';

/**
 * A wrapper component for protected routes.
 * Checks if the user is authenticated based on the presence of a token in the Redux state.
 * If authenticated, renders the child routes (Outlet).
 * If not authenticated, redirects the user to the login page, preserving the intended destination.
 */
const RequireAuth: React.FC = () => {
    // Select token, user, and status from the auth slice
    const authState = useSelector((state: RootState) => state.auth);
    // Log the state seen by this component instance
    console.log('RequireAuth sees auth state:', JSON.stringify(authState)); 
    // Destructure token, user, and status
    const { token, user, status } = authState;
    const location = useLocation();

    // Check if we have a token OR if the user object exists (set on successful login/register)
    const isAuthenticated = token || user;

    // If not considered authenticated...
    if (!isAuthenticated) {
        // BUT if auth state is currently loading, show spinner instead of redirecting immediately
        if (status === 'loading') {
            // You might want a more sophisticated full-page loading screen
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <CircularProgress />
                </Box>
            );
        }
        
        // If not loading and not authenticated, redirect to login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If authenticated, render the child routes
    return <Outlet />; 
};

export default RequireAuth; 