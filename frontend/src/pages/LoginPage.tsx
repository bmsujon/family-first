import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import LoginForm from '../features/auth/LoginForm'; // Import the actual form

const LoginPage: React.FC = () => {
    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    Sign in
                </Typography>
                <LoginForm /> { /* Render the form */ }
            </Box>
        </Container>
    );
};

export default LoginPage; 