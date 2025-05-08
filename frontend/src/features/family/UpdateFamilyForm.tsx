import React, { useEffect, useMemo } from 'react';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import {
    TextField,
    Button,
    Box,
    CircularProgress,
    Alert,
    Typography,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { updateFamily } from './familySlice'; // Import the update thunk
import { RootState, AppDispatch } from '../../store/store';
import { Family } from '../../types/models';
import { useAppSelector } from '../../store/hooks'; // Correct import path for typed hook
import { selectCurrentUser } from '../../features/auth/authSlice';
import { selectCurrentFamily } from './familySlice';

const UpdateFamilySchema = Yup.object().shape({
    name: Yup.string().required('Family name is required'),
    description: Yup.string().max(500, 'Description cannot exceed 500 characters'),
});

interface UpdateFamilyFormValues {
    name: string;
    description: string;
}

const UpdateFamilyForm: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    // Select relevant state fields
    const { currentFamily, status, error } = useAppSelector((state: RootState) => state.family);
    const currentUser = useAppSelector(selectCurrentUser);

    // Determine loading state
    const isLoading = status === 'loading';
    // Use error for server errors
    const serverError = error;

    // Determine if the current user is the family creator - use createdBy
    const isCreator = currentUser?._id === currentFamily?.createdBy;

    const handleUpdateFamily = (values: { name?: string, description?: string }) => {
        if (!currentFamily || !currentFamily._id) {
            console.error('Cannot update: Current family or ID missing');
            // Optionally dispatch a notification
            return;
        }
        // Filter out empty values before dispatching
        const updateData = Object.entries(values)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

        if (Object.keys(updateData).length === 0) {
            console.log('No changes detected for update');
            // Optionally dispatch notification: "No changes to save"
            return;
        }

        dispatch(updateFamily({ familyId: currentFamily._id, updateData }));
    };

    // Formik setup
    const initialValues = {
        name: currentFamily?.name || '',
        description: currentFamily?.description || '',
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Update Family Details</Typography>
            <Formik
                initialValues={initialValues}
                validationSchema={UpdateFamilySchema}
                onSubmit={handleUpdateFamily}
                enableReinitialize // Update form if currentFamily changes
            >
                {({ errors, touched, isSubmitting }) => (
                    <Form noValidate>
                        <Box sx={{ mt: 1, width: '100%' }}>
                            {serverError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {serverError}
                                </Alert>
                            )}
                            <Field name="name">
                                {({ field, meta }: FieldProps) => (
                                    <TextField
                                        {...field}
                                        label="Family Name"
                                        required
                                        fullWidth
                                        margin="normal"
                                        error={meta.touched && Boolean(meta.error)}
                                        helperText={meta.touched && meta.error}
                                        disabled={isLoading || isSubmitting}
                                    />
                                )}
                            </Field>
                            <Field name="description">
                                {({ field, meta }: FieldProps) => (
                                    <TextField
                                        {...field}
                                        label="Description (Optional)"
                                        fullWidth
                                        multiline
                                        rows={3}
                                        margin="normal"
                                        error={meta.touched && Boolean(meta.error)}
                                        helperText={meta.touched && meta.error}
                                        disabled={isLoading || isSubmitting}
                                    />
                                )}
                            </Field>
                            <Button
                                type="submit"
                                variant="contained"
                                sx={{ mt: 2 }}
                                disabled={isLoading || isSubmitting}
                            >
                                {(isLoading || isSubmitting) ? <CircularProgress size={24} /> : 'Save Changes'}
                            </Button>
                        </Box>
                    </Form>
                )}
            </Formik>
        </Box>
    );
};

export default UpdateFamilyForm; 