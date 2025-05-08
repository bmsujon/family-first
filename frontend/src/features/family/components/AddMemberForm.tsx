import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
    Box,
    Button,
    TextField,
    CircularProgress,
    Alert,
    Grid,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormHelperText
} from '@mui/material';
import { useSendInvitationMutation } from '../../api/apiSlice';
import { useAppDispatch } from '../../../store/hooks';
import { setNotification } from '../../../store/notificationSlice';

// Roles (customize as needed based on your application's roles)
const MEMBER_ROLES = ['Primary User', 'Secondary User', 'Member', 'Viewer'];

// Validation Schema
const validationSchema = Yup.object({
    email: Yup.string()
        .email('Enter a valid email address')
        .required('Email is required'),
    role: Yup.string()
        .oneOf(MEMBER_ROLES, 'Invalid role selected') // Validate against allowed roles
        .required('Role is required'),
});

// Form values interface
interface AddMemberFormValues {
    email: string;
    role: string;
}

// Props interface
interface AddMemberFormProps {
    familyId: string;
    onClose: () => void;
}

const AddMemberForm: React.FC<AddMemberFormProps> = ({ familyId, onClose }) => {
    const dispatch = useAppDispatch();
    const [sendInvitation, { isLoading, error }] = useSendInvitationMutation();

    const formik = useFormik<AddMemberFormValues>({
        initialValues: {
            email: '',
            role: 'Member', // Default role
        },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            try {
                await sendInvitation({ 
                    familyId,
                    email: values.email,
                    role: values.role 
                }).unwrap();
                dispatch(setNotification({ 
                    message: `Invitation sent successfully to ${values.email}!`, 
                    severity: 'success' 
                }));
                onClose(); // Close modal on success
            } catch (err) {
                console.error('Failed to send invitation:', err);
                const errorMsg = (err as any)?.data?.message || 'Failed to send invitation';
                // Don't automatically close modal on error, show error in form
                // dispatch(setNotification({ message: errorMsg, severity: 'error' }));
                // Formik automatically manages error display via the 'error' object from the hook
            }
        },
    });

    return (
        <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={2} sx={{ pt: 1 }}>
                {error && (
                    <Grid item xs={12}>
                        <Alert severity="error">
                            {(error as any)?.data?.message || 'An error occurred while sending the invitation.'}
                        </Alert>
                    </Grid>
                )}
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        id="email"
                        name="email"
                        label="Email Address to Invite"
                        type="email"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.email && Boolean(formik.errors.email)}
                        helperText={formik.touched.email && formik.errors.email}
                        required
                        disabled={isLoading}
                        autoFocus
                    />
                </Grid>
                <Grid item xs={12}>
                    <FormControl fullWidth error={formik.touched.role && Boolean(formik.errors.role)} disabled={isLoading}>
                        <InputLabel id="role-select-label">Assign Role</InputLabel>
                        <Select
                            labelId="role-select-label"
                            id="role"
                            name="role"
                            value={formik.values.role}
                            label="Assign Role"
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            required
                        >
                            {MEMBER_ROLES.map((roleOption) => (
                                <MenuItem key={roleOption} value={roleOption}>
                                    {roleOption}
                                </MenuItem>
                            ))}
                        </Select>
                        {formik.touched.role && formik.errors.role && (
                             <FormHelperText>{formik.errors.role}</FormHelperText>
                        )}
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button onClick={onClose} sx={{ mr: 1 }} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            disabled={isLoading || !formik.isValid || !formik.dirty}
                            startIcon={isLoading ? <CircularProgress size={20} /> : null}
                        >
                            Send Invitation
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </form>
    );
};

export default AddMemberForm; 