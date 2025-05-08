import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import RegisterForm from '../features/auth/RegisterForm'; // Import the actual form

const RegisterPage: React.FC = () => {
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
                    Sign up
                </Typography>
                <RegisterForm /> { /* Render the form */ }
            </Box>
        </Container>
    );
};

export default RegisterPage; 