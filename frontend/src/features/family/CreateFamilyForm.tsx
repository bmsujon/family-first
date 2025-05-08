import React, { useEffect } from 'react';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { TextField, Button, Box, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { createFamily, resetFamilyState, setCurrentFamily } from './familySlice';
import { RootState, AppDispatch } from '../../store/store';

const FamilySchema = Yup.object().shape({
    name: Yup.string().required('Family name is required').min(3, 'Must be at least 3 characters'),
});

const CreateFamilyForm: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();

    const { currentFamily, status, error } = useSelector(
        (state: RootState) => state.family
    );
    const isLoading = status === 'loading';
    const serverError = error;

    useEffect(() => {
        if (status === 'succeeded' && currentFamily) {
            navigate(`/families/${currentFamily._id}/dashboard`);
        }

        return () => {
            dispatch(resetFamilyState());
        };
    }, [status, currentFamily, navigate, dispatch]);

    const handleCreate = (values: { name: string }) => {
        dispatch(createFamily(values));
    };

    return (
        <Formik
            initialValues={{ name: '' }}
            validationSchema={FamilySchema}
            onSubmit={(values, { setSubmitting }) => {
                handleCreate(values);
            }}
        >
            {({ errors, touched, isSubmitting }) => (
                <Form noValidate>
                    <Box sx={{ mt: 1, width: '100%' }}>
                        {serverError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {serverError}
                            </Alert>
                        )}
                        <Field
                            as={TextField}
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            id="name"
                            label="Family Name"
                            name="name"
                            autoFocus
                            error={touched.name && Boolean(errors.name)}
                            helperText={touched.name && errors.name}
                            disabled={isLoading || isSubmitting}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={isLoading || isSubmitting}
                        >
                            {(isLoading || isSubmitting) ? <CircularProgress size={24} /> : 'Create Family'}
                        </Button>
                    </Box>
                </Form>
            )}
        </Formik>
    );
};

export default CreateFamilyForm; 