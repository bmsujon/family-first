import React, { useEffect } from 'react';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { TextField, Button, Box, CircularProgress, Alert } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { register, reset } from './authSlice'; // Import register action and reset
import { RootState, AppDispatch } from '../../store/store';

const RegisterSchema = Yup.object().shape({
    firstName: Yup.string().required('Required'),
    lastName: Yup.string().required('Required'),
    familyName: Yup.string().required('Required'),
    email: Yup.string().email('Invalid email').required('Required'),
    password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Required'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), undefined], 'Passwords must match')
        .required('Required'),
});

const RegisterForm: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();

    const { user, token, isLoading, isError, isSuccess, message } = useSelector(
        (state: RootState) => state.auth
    );

    useEffect(() => {
        // Redirect only if registration was successful in this session
        if (isSuccess) { 
            // Introduce a small delay to allow state propagation before navigating
            const timer = setTimeout(() => {
                navigate('/'); // Redirect to dashboard or home page
            }, 100); // 100ms delay - adjust if needed

            // Clear the timer if the component unmounts or dependencies change 
            // before the timer fires (good practice)
            return () => clearTimeout(timer);
        }

        // Reset state on component unmount or if error/success changes
        // Important: Resetting here ensures that if the user navigates away 
        //            before success, the flags are cleared.
    // Only depend on isSuccess for the redirect logic. 
    // Keep navigate and dispatch as standard dependencies.
    }, [isSuccess, navigate, dispatch]);

    const handleRegister = (values: any) => {
        const { confirmPassword, ...registerData } = values;
        dispatch(register(registerData)); // Dispatch the register thunk
    };

    return (
        <Formik
            initialValues={{
                firstName: '',
                lastName: '',
                familyName: '',
                email: '',
                password: '',
                confirmPassword: '',
            }}
            validationSchema={RegisterSchema}
            onSubmit={(values) => {
                handleRegister(values);
            }}
        >
            {() => (
                <Form noValidate>
                    <Box sx={{ mt: 3 }}>
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
                                        disabled={isLoading}
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
                                        disabled={isLoading}
                                    />
                                )}
                            </Field>
                        </Box>
                        <Field name="familyName">
                            {({ field, meta }: FieldProps) => (
                                <TextField
                                    {...field}
                                    label="Family Name"
                                    required
                                    fullWidth
                                    autoComplete="organization"
                                    error={meta.touched && Boolean(meta.error)}
                                    helperText={meta.touched && meta.error}
                                    disabled={isLoading}
                                    sx={{ mb: 2 }}
                                />
                            )}
                        </Field>
                        <Field name="email">
                            {({ field, meta }: FieldProps) => (
                                <TextField
                                    {...field}
                                    label="Email Address"
                                    type="email"
                                    required
                                    fullWidth
                                    autoComplete="email"
                                    error={meta.touched && Boolean(meta.error)}
                                    helperText={meta.touched && meta.error}
                                    disabled={isLoading}
                                    sx={{ mb: 2 }}
                                />
                            )}
                        </Field>
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
                                    disabled={isLoading}
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
                                    disabled={isLoading}
                                    sx={{ mb: 2 }}
                                />
                            )}
                        </Field>
                        {/* Error Alert */}
                        {isError && message && (
                            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                                {message}
                            </Alert>
                        )}
                        {/* Submit Button */}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={isLoading}
                        >
                            {isLoading ? <CircularProgress size={24} /> : 'Sign Up'}
                        </Button>
                        {/* Link to Login */}
                        <Box textAlign="center">
                            <RouterLink to="/login">
                                {"Already have an account? Sign in"}
                            </RouterLink>
                        </Box>
                    </Box>
                </Form>
            )}
        </Formik>
    );
};

export default RegisterForm;