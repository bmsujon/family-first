import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import CreateFamilyForm from '../features/family/CreateFamilyForm';

const CreateFamilyPage: React.FC = () => {
    return (
        <Container component="main" maxWidth="sm">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5" gutterBottom>
                    Create a New Family
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Give your family group a name to get started.
                </Typography>
                <CreateFamilyForm />
            </Box>
        </Container>
    );
};

export default CreateFamilyPage; 