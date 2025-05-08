import React, { useState, useMemo } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
    Box,
    Button,
    TextField,
    Typography,
    CircularProgress,
    Alert,
    Collapse,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { sendInvitation } from './familySlice';
import { RootState, AppDispatch } from '../../store/store';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { selectCurrentFamily } from './familySlice';

// Define available roles (these should ideally align with backend roles/enums)
const roles = ['Parent', 'Child', 'Guardian', 'Relative']; // Example roles

// Validation Schema
const AddMemberSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email').required('Email is required'),
    role: Yup.string().oneOf(roles, 'Invalid role').required('Role is required'),
});

interface AddMemberFormValues {
    email: string;
    role: string;
}

const AddMemberForm: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { status, error } = useSelector((state: RootState) => state.family);
    const currentFamily = useAppSelector(selectCurrentFamily);
    const currentUser = useAppSelector(selectCurrentUser);

    // Use status for loading state
    const isLoading = status === 'loading'; 
    // Use error for error message
    const serverError = error; 

    // Determine if the current user is the family creator - use createdBy
    const isCreator = useMemo(() => {
        if (!currentUser || !currentFamily || !currentFamily.createdBy) {
            return false;
        }
        if (typeof currentFamily.createdBy === 'object' && currentFamily.createdBy !== null) {
            return currentFamily.createdBy._id === currentUser._id;
        } else if (typeof currentFamily.createdBy === 'string') {
            return currentFamily.createdBy === currentUser._id;
        }
        return false;
    }, [currentUser, currentFamily]);

    const handleAddMember = (values: AddMemberFormValues, { resetForm }: { resetForm: () => void }) => {
        if (!currentFamily?._id || !isCreator) {
            console.error("User does not have permission or family not selected");
            return;
        }

        dispatch(sendInvitation({ 
            familyId: currentFamily._id,
            email: values.email,
            role: values.role,
         }))
            .unwrap()
            .then(() => {
                resetForm();
            })
            .catch((err: any) => {
                console.error("Failed to add member:", err);
            });
    };

    // Only render the form if the user is the creator and a family is selected
    if (!isCreator || !currentFamily) {
        return null;
    }

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>Add Family Member</Typography>
            <Formik
                initialValues={{ email: '', role: '' }}
                validationSchema={AddMemberSchema}
                onSubmit={handleAddMember}
            >
                {({ errors, touched, isSubmitting }) => (
                    <Form>
                        <Field
                            as={TextField}
                            name="email"
                            label="Member Email"
                            type="email"
                            fullWidth
                            required
                            margin="normal"
                            error={touched.email && Boolean(errors.email)}
                            helperText={touched.email && errors.email}
                            disabled={isSubmitting}
                        />
                        <FormControl fullWidth margin="normal" required error={touched.role && Boolean(errors.role)} disabled={isSubmitting}>
                            <InputLabel id="role-select-label">Role</InputLabel>
                            <Field
                                as={Select}
                                name="role"
                                labelId="role-select-label"
                                label="Role"
                            >
                                <MenuItem value="" disabled><em>Select a role</em></MenuItem>
                                {roles.map((role) => (
                                    <MenuItem key={role} value={role}>{role}</MenuItem>
                                ))}
                            </Field>
                            {touched.role && errors.role && <Typography color="error" variant="caption" sx={{ ml: 2 }}>{errors.role}</Typography>}
                        </FormControl>
                        
                        {/* Display error message from the slice */}
                        {serverError && (
                            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                                {serverError}
                            </Alert>
                        )}
                        
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={isLoading || !isCreator}
                        >
                            {isLoading ? <CircularProgress size={24} /> : 'Send Invitation'}
                        </Button>
                    </Form>
                )}
            </Formik>
        </Box>
    );
};

export default AddMemberForm; 