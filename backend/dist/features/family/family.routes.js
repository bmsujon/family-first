"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const FamilyController = __importStar(require("./family.controller"));
const auth_middleware_1 = require("../auth/auth.middleware"); // Import the protect middleware
const familyMembershipMiddleware_1 = require("../../middleware/familyMembershipMiddleware"); // Import middleware
const family_controller_1 = require("./family.controller"); // Import the new handler
const router = express_1.default.Router();
// Route to get families for the current user (protected)
router.get('/mine', auth_middleware_1.protect, FamilyController.getMyFamilies);
// Route to create a new family (protected)
router.post('/', auth_middleware_1.protect, FamilyController.createNewFamily);
// Route to get details for a specific family
router.get('/:familyId', auth_middleware_1.protect, // 1. Ensure user is logged in
familyMembershipMiddleware_1.checkFamilyMembership, // 2. Ensure user is a member of this family
FamilyController.getFamilyDetails // 3. Get the details
);
// Route to add a member to a specific family
router.post('/:familyId/members', auth_middleware_1.protect, // 1. Ensure user is logged in
familyMembershipMiddleware_1.checkFamilyMembership, // 2. Ensure requesting user is part of the family
// 3. Service function checks if user is creator (for now)
FamilyController.addMember // 4. Add the member
);
// Route to update family details
router.put('/:familyId', auth_middleware_1.protect, // 1. Ensure user is logged in
familyMembershipMiddleware_1.checkFamilyMembership, // 2. Ensure requesting user is part of the family
// 3. Service function checks if user is creator (for now)
FamilyController.updateFamily // 4. Update the family
);
// Route to send an invitation for a specific family
router.post('/:familyId/invites', auth_middleware_1.protect, // 1. Ensure user is logged in
familyMembershipMiddleware_1.checkFamilyMembership, // 2. Ensure requesting user is part of the family
// 3. Service checks if user is creator (for now)
FamilyController.sendInvite // 4. Create invitation and send email (placeholder)
);
// Route to accept an invitation
router.post('/invitations/accept/:token', auth_middleware_1.protect, FamilyController.acceptInvite);
// Route to get invitation details
router.get('/invitations/:token/details', FamilyController.getInviteDetails);
// Route to register and accept an invitation
router.post('/invitations/accept-register', family_controller_1.registerAndAcceptInvitationHandler);
// Routes for managing family members within a specific family
router.route('/:familyId/members')
    .post(auth_middleware_1.protect, familyMembershipMiddleware_1.checkFamilyMembership, FamilyController.addMember); // Add a member to the family
// TODO: Add PUT (update member role)
// Add DELETE route for removing a member
router.route('/:familyId/members/:memberId')
    .delete(auth_middleware_1.protect, familyMembershipMiddleware_1.checkFamilyMembership, family_controller_1.removeMember); // Requires login, family membership, service checks creator role
// Add PUT route for changing a member's role
router.route('/:familyId/members/:memberId/role')
    .put(auth_middleware_1.protect, familyMembershipMiddleware_1.checkFamilyMembership, family_controller_1.changeMemberRoleHandler); // Requires login, family membership, service checks creator role
// TODO: Add routes for:
// - GET / (Alternative to /mine? Maybe admin only?)
// - DELETE /:familyId (Delete family - protected, permission check needed)
exports.default = router;
