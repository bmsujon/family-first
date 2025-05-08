import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { useDispatch } from 'react-redux';
import { setCredentials, setAuthSnackbar } from '../features/auth/authSlice';
import { useRegisterAndAcceptInviteMutation } from '../features/api/apiSlice';

// TODO: Import or define your actual Snackbar hook/function
// import { useSnackbar } from '../../context/SnackbarContext'; // Example import

interface InvitationRegistrationFormProps {
    email: string;      // Pre-filled from invitation
    token: string;      // Invitation token
    familyName: string; // Displayed for context
}

const InvitationRegistrationForm: React.FC<InvitationRegistrationFormProps> = ({ email, token, familyName }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch<any>();

    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [registerAndAccept, { isLoading: isRegistering, error: registrationError }] = useRegisterAndAcceptInviteMutation();

    useEffect(() => {
        if (registrationError) {
            let errorMessage = 'Registration failed.';
            if ('data' in registrationError && typeof (registrationError.data as any)?.message === 'string') {
                errorMessage = (registrationError.data as any).message;
            } else if ('error' in registrationError) {
                errorMessage = registrationError.error;
            }
            dispatch(setAuthSnackbar({ message: errorMessage, severity: 'error' }));
            setError(errorMessage);
        } else {
            setError(null);
        }
    }, [registrationError, dispatch]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        // Basic validation
        if (!firstName || !lastName || !password) {
            setError('Please fill in all fields.');
            return;
        }

        console.log('Submitting registration for invite:', { token, firstName, lastName, email, password });

        try {
            const result = await registerAndAccept({ 
                token, 
                firstName, 
                lastName, 
                email, 
                password 
            }).unwrap();
            console.log('API Success:', result);

            dispatch(setCredentials({ user: result.user, token: result.token }));
            console.log('Dispatched setCredentials with user and token');
            
            navigate('/');

        } catch (err: any) { 
            console.error('Registration failed:', err);
            if (!error) {
                let message = 'An unexpected error occurred during registration.';
                if (err?.data?.message) {
                    message = err.data.message;
                } else if (err?.message) {
                    message = err.message;
                }
                setError(message);
            }
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
                margin="normal"
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                value={email}
                InputProps={{
                    readOnly: true,
                }}
                variant="filled"
            />
            <TextField
                margin="normal"
                required
                fullWidth
                id="firstName"
                label="First Name"
                name="firstName"
                autoComplete="given-name"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isRegistering}
            />
            <TextField
                margin="normal"
                required
                fullWidth
                id="lastName"
                label="Last Name"
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isRegistering}
            />
            <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isRegistering}
            />

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            )}

            <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={isRegistering}
                startIcon={isRegistering ? <CircularProgress size="1rem" color="inherit" /> : null}
            >
                {isRegistering ? 'Creating Account...' : `Create Account & Join ${familyName}`}
            </Button>
        </Box>
    );
};

export default InvitationRegistrationForm; 