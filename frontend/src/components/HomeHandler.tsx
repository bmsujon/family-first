import React, { useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { RootState } from '../store/store';
import TaskList from '../features/tasks/components/TaskList';
import AddMemberForm from '../features/family/AddMemberForm';
import { Box, CircularProgress, Typography, Button, Container, Divider, Alert, AlertTitle, Chip, Paper } from '@mui/material';
import { Family } from '../types/models';
import { selectIsAuthenticated } from '../features/auth/authSlice';
import { useAppSelector } from '../store/hooks';
import { useGetMyFamiliesQuery } from '../features/api/apiSlice';

// Simple Dashboard component to display current family info
const SimpleDashboard: React.FC<{ family: Family }> = ({ family }) => {
    const familyName = family.name;
    const familyId = family._id;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Welcome to {familyName}
            </Typography>
            {family.description && (
                <Typography variant="body1" color="text.secondary" paragraph>
                    {family.description}
                </Typography>
            )}
            
            {/* --- Tasks Section --- */}
            <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, mt: 3, mb: 3 }}>
                {familyId && <TaskList familyId={familyId} />}
            </Paper>

            {/* --- Members Section --- */}
            <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, mt: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Manage Members
                </Typography>
                <AddMemberForm />
            </Paper>

        </Container>
    );
};

const HomeHandler = () => {
    const { 
        data: familiesData,
        isLoading,
        isError,
        error 
    } = useGetMyFamiliesQuery();

    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const navigate = useNavigate();

    const families = familiesData?.families || [];

    console.log('>>> HomeHandler Render (RTK): isLoading:', isLoading, 'isError:', isError, 'families length:', families.length);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            console.log("HomeHandler useEffect: Not loading & Not authenticated, redirecting to login.");
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    if (isLoading) {
        console.log(`HomeHandler: Loading state (RTK Query isLoading: ${isLoading})`);
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (isError) {
        const errorMessage = (error as any)?.data?.message || (error as any)?.error || 'Unknown error';
        console.error("HomeHandler: Failed to fetch families (RTK Query):", error);
        return (
            <Container maxWidth="sm" sx={{ mt: 8 }}>
                <Alert severity="error">
                    <AlertTitle>Error</AlertTitle>
                    Failed to load family data: {errorMessage}. Please try refreshing the page or contact support.
                </Alert>
            </Container>
        );
    }

    if (isAuthenticated) {
        console.log(`HomeHandler: Success/Authenticated state check (RTK) -> families.length: ${families.length}`);
        if (families.length === 0) {
            console.log("HomeHandler: No families found, redirecting to /create-family");
            return <Navigate to="/create-family" replace />;
        } else {
            console.log("HomeHandler: Families found, rendering SimpleDashboard");
            const currentFamily = families[0];
            console.log(`>>> HomeHandler passing familyId ${currentFamily._id} to SimpleDashboard <<<`);
            return <SimpleDashboard family={currentFamily} />;
        }
    }

    console.warn("HomeHandler: Reached fallback rendering state (likely during auth check/redirect).");
    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
            <CircularProgress />
        </Box>
    );
};

export default HomeHandler; 