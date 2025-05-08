import React, { useEffect, useState } from 'react';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { TextField, Button, Box, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
// Import the specific register action for invites
import { registerWithInvite, reset } from './authSlice'; 
import { RootState, AppDispatch } from '../../store/store';

// Adjusted Schema: No familyName, confirmPassword is still good practice
const RegisterInviteSchema = Yup.object().shape({
    firstName: Yup.string().required('Required'),
    lastName: Yup.string().required('Required'),
    email: Yup.string().email('Invalid email').required('Required'), // Keep email validation
    password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Required'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), undefined], 'Passwords must match')
        .required('Required'),
});

// Props for the form
interface RegisterInviteFormProps {
    invitationToken: string;
    invitedEmail: string; // Email from the invitation, passed as prop
}

const RegisterInviteForm: React.FC<RegisterInviteFormProps> = ({ invitationToken, invitedEmail }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();

    const { user, token, isLoading, isError, isSuccess, message } = useSelector(
        (state: RootState) => state.auth
    );
    
    // Local state for form-specific error messages if needed, separate from slice
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        // Redirect on successful registration
        if (isSuccess && token) { // Check for token as well
            navigate('/'); // Redirect to dashboard
        }
        
        // Reset auth slice state on unmount
        return () => {
            dispatch(reset());
        };
    }, [isSuccess, token, navigate, dispatch]);

    const handleRegister = (values: any) => {
        setFormError(null); // Clear previous form errors
        // Exclude confirmPassword, include token
        const { confirmPassword, email, ...restOfValues } = values; 
        const registerData = { 
            ...restOfValues, 
            email: invitedEmail, // Use the pre-filled, non-editable email
            invitationToken 
        };
        
        dispatch(registerWithInvite(registerData))
            .unwrap()
            .catch((err) => {
                // Error message is handled by the slice and displayed via Alert
                // Optionally set local form error if needed for specific placement
                console.error("Register via Invite Error:", err);
                setFormError(err.message || "Registration failed"); 
            });
    };

    return (
        <Formik
            initialValues={{
                firstName: '',
                lastName: '',
                email: invitedEmail, // Pre-fill email
                password: '',
                confirmPassword: '',
            }}
            validationSchema={RegisterInviteSchema}
            onSubmit={(values, { setSubmitting }) => {
                // isSubmitting is automatically handled by Formik via promise state
                handleRegister(values); 
            }}
            // Enable reinitialization in case email prop changes (though unlikely needed here)
            enableReinitialize 
        >
            {({ isSubmitting }) => ( // Get isSubmitting from Formik render props
                <Form noValidate>
                    <Box sx={{ mt: 1 }}>
                        {/* Display combined error from slice or form submission */}
                        {(isError || formError) && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {formError || message || "An error occurred."}
                            </Alert>
                        )}
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                            <Field name="firstName">
                                {({ field, meta }: FieldProps) => (
                                    <TextField
                                        {...field}
                                        label="First Name"
                                        required
                                        fullWidth
                                        autoComplete="given-name"
                                        autoFocus
                                        error={meta.touched && Boolean(meta.error)}
                                        helperText={meta.touched && meta.error}
                                        disabled={isLoading || isSubmitting}
                                    />
                                )}
                            </Field>
                            <Field name="lastName">
                                {({ field, meta }: FieldProps) => (
                                    <TextField
                                        {...field}
                                        label="Last Name"
                                        required
                                        fullWidth
                                        autoComplete="family-name"
                                        error={meta.touched && Boolean(meta.error)}
                                        helperText={meta.touched && meta.error}
                                        disabled={isLoading || isSubmitting}
                                    />
                                )}
                            </Field>
                        </Box>
                        <Field name="email">
                            {({ field, meta }: FieldProps) => (
                                <TextField
                                    {...field}
                                    label="Email Address"
                                    type="email"
                                    required
                                    fullWidth
                                    // Email is pre-filled and should not be changed by user
                                    disabled={true} 
                                    error={meta.touched && Boolean(meta.error)}
                                    helperText={meta.touched && meta.error}
                                    sx={{ mb: 2, backgroundColor: '#f5f5f5' }} // Indicate disabled state visually
                                />
                            )}
                        </Field>
                        {/* Omit Family Name field */}
                        <Field name="password">
                            {({ field, meta }: FieldProps) => (
                                <TextField
                                    {...field}
                                    label="Password"
                                    type="password"
                                    required
                                    fullWidth
                                    autoComplete="new-password"
                                    error={meta.touched && Boolean(meta.error)}
                                    helperText={meta.touched && meta.error}
                                    disabled={isLoading || isSubmitting}
                                    sx={{ mb: 2 }}
                                />
                            )}
                        </Field>
                        <Field name="confirmPassword">
                            {({ field, meta }: FieldProps) => (
                                <TextField
                                    {...field}
                                    label="Confirm Password"
                                    type="password"
                                    required
                                    fullWidth
                                    error={meta.touched && Boolean(meta.error)}
                                    helperText={meta.touched && meta.error}
                                    disabled={isLoading || isSubmitting}
                                    sx={{ mb: 2 }}
                                />
                            )}
                        </Field>
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 2, mb: 2 }}
                            disabled={isLoading || isSubmitting} // Disable based on slice loading OR formik submitting
                        >
                            {(isLoading || isSubmitting) ? <CircularProgress size={24} /> : 'Sign Up & Accept Invitation'}
                        </Button>
                    </Box>
                </Form>
            )}
        </Formik>
    );
};

export default RegisterInviteForm; 