import React, { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { TextField, Button, Box, CircularProgress, Alert } from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { login, reset } from './authSlice';
import { acceptInvitation } from '../family/familySlice';
import { RootState, AppDispatch } from '../../store/store';

const LoginSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email').required('Required'),
    password: Yup.string().required('Required'),
});

const LoginForm: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const location = useLocation();

    // State to prevent double-processing invite
    const [inviteProcessed, setInviteProcessed] = useState(false);

    // Select relevant state from Redux
    const { user, token, isLoading, isError, isSuccess, message } = useSelector(
        (state: RootState) => state.auth
    );

    useEffect(() => {
        if ((isSuccess || token) && !inviteProcessed) {
            const params = new URLSearchParams(location.search);
            const returnTo = params.get('returnTo');
            let inviteToken: string | null = null;

            if (returnTo) {
                try {
                    const returnToUrl = new URL(returnTo, window.location.origin);
                    if (returnToUrl.pathname.startsWith('/accept-invite/')) {
                        inviteToken = returnToUrl.pathname.split('/accept-invite/')[1];
                    }
                } catch (e) {
                    console.error('Error parsing returnTo URL:', e);
                }
            }

            if (inviteToken) {
                setInviteProcessed(true);
                dispatch(acceptInvitation(inviteToken));
                navigate('/');
            } else {
                navigate('/');
            }
        }
    }, [isSuccess, token, navigate, dispatch, location, inviteProcessed]);

    const handleLogin = (values: any) => {
        console.log('[LoginForm] handleLogin called with values:', values.email);
        const userData = {
            email: values.email,
            password: values.password,
        };
        console.log('[LoginForm] Dispatching login action...');
        dispatch(login(userData));
    };

    return (
        <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={(values, { setSubmitting }) => {
                handleLogin(values);
            }}
        >
            {({ errors, touched }) => (
                <Form noValidate>
                    <Box sx={{ mt: 1 }}>
                        <Field
                            as={TextField}
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            error={touched.email && Boolean(errors.email)}
                            helperText={touched.email && errors.email}
                            disabled={isLoading}
                        />
                        <Field
                            as={TextField}
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            error={touched.password && Boolean(errors.password)}
                            helperText={touched.password && errors.password}
                            disabled={isLoading}
                        />
                        {isError && message && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {message}
                            </Alert>
                        )}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={isLoading}
                        >
                            {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
                        </Button>
                        <Box textAlign="center">
                             <RouterLink to="/register">
                                {"Don't have an account? Sign Up"}
                             </RouterLink>
                        </Box>
                    </Box>
                </Form>
            )}
        </Formik>
    );
};

export default LoginForm; 