import express from 'express';
import * as AuthController from './auth.controller';
// Import authentication middleware
import { protect } from './auth.middleware';

const router = express.Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// New route for registering via invitation token
router.post('/register-invite', AuthController.registerWithInvite);

// Protected route for getting user profile
router.get('/profile', protect, AuthController.getProfile);

// TODO: Add routes for password reset, email verification etc.

export default router; 