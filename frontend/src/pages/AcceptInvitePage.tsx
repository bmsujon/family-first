import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Container, Paper, Button } from '@mui/material';
import {
    useGetInvitationDetailsQuery,
    useAcceptInviteMutation
} from '../features/api/apiSlice';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import InvitationRegistrationForm from '../components/InvitationRegistrationForm';

// No need for local interface, RTK Query hook provides typed data based on apiSlice definition

const AcceptInvitePage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const currentUser = useSelector(selectCurrentUser);

    // --- RTK Query Hook for fetching details --- 
    const { 
        data: invitationDetails, 
        isLoading: isLoadingDetails,
        isError: isErrorDetails, 
        error: detailsErrorObject
    } = useGetInvitationDetailsQuery(token!, { 
        skip: !token, 
    });

    // --- RTK Query Mutation Hook for accepting invite --- 
    const [acceptInvite, { 
        isLoading: isAccepting, 
        isSuccess: isAcceptSuccess, 
        isError: isAcceptError,
        error: acceptErrorObject 
    }] = useAcceptInviteMutation();

    // --- Error Message Processing (Details) --- 
    let detailsErrorMessage: string | null = null;
    if (isErrorDetails && detailsErrorObject) {
        console.error("API Error fetching invite details:", detailsErrorObject);
        if ('status' in detailsErrorObject) {
            const serverMessage = (detailsErrorObject.data as any)?.message;
            detailsErrorMessage = serverMessage || `Error ${detailsErrorObject.status}`;
        } else if ('message' in detailsErrorObject) {
            detailsErrorMessage = detailsErrorObject.message ?? 'An unknown error occurred.';
        } else {
            detailsErrorMessage = 'Failed to load invitation details due to an unknown error.';
        }
    }

    // --- Error Message Processing (Accept Mutation) --- 
    let acceptErrorMessage: string | null = null;
    if (isAcceptError && acceptErrorObject) {
        console.error("API Error accepting invite:", acceptErrorObject);
        if ('status' in acceptErrorObject) {
            const serverMessage = (acceptErrorObject.data as any)?.message;
            acceptErrorMessage = serverMessage || `Error ${acceptErrorObject.status}`;
        } else if ('message' in acceptErrorObject) {
            acceptErrorMessage = acceptErrorObject.message ?? 'An unknown error occurred while accepting.';
        } else {
            acceptErrorMessage = 'Failed to accept invitation due to an unknown error.';
        }
    }

    // --- Handle Successful Acceptance --- 
    useEffect(() => {
        if (isAcceptSuccess) {
            // Navigate to a relevant page, e.g., home or family dashboard
            // Consider passing the familyId if needed
            navigate('/'); // Navigate to home for now
        }
    }, [isAcceptSuccess, navigate]);

    // --- Accept Button Handler ---
    const handleAccept = async () => {
        if (token) {
            try {
                await acceptInvite(token).unwrap(); // unwrap() throws error on failure
                // Success navigation is handled by the useEffect hook
            } catch (err) {
                // Error message display is handled by acceptErrorMessage state
                console.error('Failed to accept invite:', err);
            }
        }
    };

    // Function to render main content based on state
    const renderContent = () => {
        if (isLoadingDetails) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Verifying invitation...</Typography>
                </Box>
            );
        }

        if (detailsErrorMessage) {
            return (
                <Alert severity="error" sx={{ width: '100%' }}>
                    {detailsErrorMessage} Go back to <RouterLink to="/">Homepage</RouterLink>.
                </Alert>
            );
        }

        if (!invitationDetails) {
             console.warn('AcceptInvitePage: No invitation details loaded, not loading, and no specific error caught.');
             return <Alert severity="warning" sx={{ width: '100%' }}>Could not load invitation details. The link may be invalid.</Alert>;
        }

        // --- We have invitationDetails --- 

        // Scenario 1: Invitation is for an EXISTING user
        if (invitationDetails.isExistingUser) {
            // Check if user is logged in
            if (currentUser) {
                // Logged in: Check if email matches
                if (currentUser.email === invitationDetails.email) {
                    // Email matches: Show accept button
                    return (
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" gutterBottom>
                                Accept Invitation
                            </Typography>
                            <Typography paragraph>
                                You have been invited to join <strong>{invitationDetails.familyName}</strong> as a {invitationDetails.role}.
                            </Typography>
                            {acceptErrorMessage && (
                                <Alert severity="error" sx={{ my: 2 }}>{acceptErrorMessage}</Alert>
                            )}
                            <Button 
                                variant="contained" 
                                onClick={handleAccept}
                                disabled={isAccepting}
                                sx={{ mt: 2 }}
                            >
                                {isAccepting ? <CircularProgress size={24} /> : 'Accept Invitation'}
                            </Button>
                        </Box>
                    );
                } else {
                    // Email mismatch: Show error message
                    return (
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" gutterBottom color="error">
                                Email Mismatch
                            </Typography>
                             <Alert severity="warning" sx={{ my: 2 }}>
                                This invitation was sent to <strong>{invitationDetails.email}</strong>, but you are currently logged in as <strong>{currentUser.email}</strong>.
                            </Alert>
                            <Typography paragraph>
                                Please log out and log back in with the correct account to accept the invitation to join <strong>{invitationDetails.familyName}</strong>.
                            </Typography>
                            <Button 
                                variant="outlined" 
                                component={RouterLink} 
                                to="/login" 
                                sx={{ mt: 2, mr: 1 }}
                            >
                                Go to Login
                            </Button>
                            {/* Optional: Add a logout button? Requires dispatch */}
                        </Box>
                    );
                }
            } else {
                // Not logged in: Show message and link to login (existing behavior)
                return (
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" gutterBottom>
                            Accept Invitation
                        </Typography>
                        <Typography paragraph>
                            This invitation to join <strong>{invitationDetails.familyName}</strong> is associated with the email <strong>{invitationDetails.email}</strong>.
                        </Typography>
                        <Alert severity="info" sx={{ my: 2 }}>
                            Please log in with your existing account to accept the invitation.
                        </Alert>
                        <Button 
                            variant="contained" 
                            component={RouterLink} 
                            to={`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`} 
                            sx={{ mt: 2 }}
                        >
                            Go to Login
                        </Button>
                    </Box>
                );
            }
        }

        // Scenario 2: Invitation is for a NEW user (existing behavior)
        return (
            <Box sx={{ width: '100%' }}>
                    <Typography variant="h5" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
                    Join {invitationDetails.familyName}!
                </Typography>
                <Typography paragraph sx={{ textAlign: 'center' }}>
                    You've been invited to join the family. Complete your registration below.
                </Typography>
                
                <InvitationRegistrationForm 
                    email={invitationDetails.email}
                    token={token!} 
                    familyName={invitationDetails.familyName}
                />
             </Box>
        );
    };

    return (
        <Container component="main" maxWidth="sm">
            <Paper elevation={3} sx={{ padding: { xs: 2, sm: 4 }, marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {renderContent()}
            </Paper>
        </Container>
    );
};

export default AcceptInvitePage; 