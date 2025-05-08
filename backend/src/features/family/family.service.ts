import Family, { IFamily } from '../../models/Family';
import User, { IUser } from '../../models/User';
import Task from '../../models/Task';
import Invitation, { IInvitation } from '../../models/Invitation';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { sendInvitationEmail } from '../../services/emailService';
import bcrypt from 'bcryptjs';
import { generateToken } from '../auth/auth.service';

// Define a type for the public invitation details
interface PublicInvitationDetails {
    email: string;
    role: string;
    familyName: string;
    isExistingUser: boolean;
}

// Define a type for the user data we actually return (excluding sensitive fields)
interface ReturnedUser {
    _id: mongoose.Types.ObjectId;
    firstName?: string;
    lastName?: string;
    email: string;
    profilePicture?: string;
    isVerified: boolean;
    families?: { _id: mongoose.Types.ObjectId; name: string }[]; // Define shape of populated families
}

interface CreateFamilyData {
    name: string;
    creatorUserId: string | mongoose.Types.ObjectId;
}

// Service to create a new family
export const createFamily = async (familyData: CreateFamilyData): Promise<IFamily> => {
    const { name, creatorUserId } = familyData;

    // Validate creator user exists (optional, but good practice)
    const creator = await User.findById(creatorUserId);
    if (!creator) {
        throw new Error('Creator user not found');
    }

    // Create the family
    // The pre-save hook in the Family model will automatically add the creator as a member
    const family = new Family({
        name,
        createdBy: creatorUserId,
        // members array is handled by the pre-save hook
    });

    await family.save();
    // Populate creator details before returning (optional, but often useful)
    // await family.populate('createdBy', 'firstName lastName email'); // Example population
    // await family.populate('members.userId', 'firstName lastName email'); // Example population
    return family;
};

// Service to get families for a specific user
export const getFamiliesByUser = async (userId: string | mongoose.Types.ObjectId): Promise<IFamily[]> => {
    // Find families where the members array contains an object with the specified userId
    const families = await Family.find({ 'members.userId': userId })
        // Optionally populate member details or creator details if needed immediately
        // .populate('members.userId', 'firstName email') 
        // .populate('createdBy', 'firstName email');
        .exec(); 
    return families;
};

// Service to get a single family by its ID, populating members
export const getFamilyById = async (
    familyId: string | mongoose.Types.ObjectId,
    requestingUserId: string | mongoose.Types.ObjectId // Needed for permission check
): Promise<IFamily | null> => {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
        throw new Error('Invalid Family ID format');
    }

    // Find the family
    const family = await Family.findById(familyId)
        .populate('createdBy', 'firstName lastName email') // Populate creator info
        .populate('members.userId', 'firstName lastName email profilePicture') // Populate member info
        .exec();

    // Check if family exists and if the requesting user is a member
    if (!family) {
        return null; // Not found
    }
    
    const isMember = family.members.some(member => member.userId?._id.equals(requestingUserId));
    if (!isMember) {
         // Throw a permission error if the user is not a member
        const permissionError = new Error('User does not have permission to view this family');
        (permissionError as any).statusCode = 403;
        throw permissionError;
    }

    return family;
};

// Interface for adding a member
interface AddMemberData {
    familyId: string | mongoose.Types.ObjectId;
    emailToAdd: string; // Use email to find the user to add
    role: string; // Role to assign to the new member
    requestingUserId: string | mongoose.Types.ObjectId; // User performing the action
}

// Service to add a member to a family
export const addMemberToFamily = async (data: AddMemberData): Promise<IFamily> => {
    const { familyId, emailToAdd, role, requestingUserId } = data;

    // 1. Validate IDs and Email
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
        throw new Error('Invalid Family ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(requestingUserId)) {
        throw new Error('Invalid Requesting User ID format');
    }
    // Basic email format check (more robust validation might be needed)
    if (!emailToAdd || !/\S+@\S+\.\S+/.test(emailToAdd)) {
        throw new Error('Invalid email format for user to add');
    }
    // TODO: Validate role against allowed roles enum/list if available

    // 2. Find the user to add by email
    const userToAdd = await User.findOne({ email: emailToAdd.toLowerCase() }).exec();
    if (!userToAdd) {
        throw new Error(`User with email ${emailToAdd} not found.`);
    }

    // 3. Find the family
    const family = await Family.findById(familyId).exec();
    if (!family) {
        throw new Error('Family not found');
    }

    // 4. Permission Check: Only creator can add members (for now)
    if (!family.createdBy || String(family.createdBy) !== String(requestingUserId)) {
        const permissionError = new Error('Only the family creator can add members');
        (permissionError as any).statusCode = 403;
        throw permissionError;
    }

    // 5. Check if user is already a member
    const isAlreadyMember = family.members.some(
        member => member.userId && String(member.userId) === String(userToAdd._id)
    );
    if (isAlreadyMember) {
        throw new Error(`User ${emailToAdd} is already a member of this family.`);
    }

    // 6. Add the member
    family.members.push({
        userId: userToAdd._id,
        role: role, // Use the provided role
        joinedAt: new Date(),
    });

    // 7. Save the updated family document
    await family.save();

    // 8. Populate and return the updated family (optional, but good for response)
    await family.populate('members.userId', 'firstName lastName email profilePicture');

    return family;
};

// Interface for updating family data
interface UpdateFamilyData {
    name?: string;        // Optional: new name
    description?: string; // Optional: new description
    // Add other updatable fields like settings later
}

// Service to update family details
export const updateFamily = async (
    familyId: string | mongoose.Types.ObjectId,
    updateData: UpdateFamilyData,
    requestingUserId: string | mongoose.Types.ObjectId
): Promise<IFamily | null> => {

    // 1. Validate IDs
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
        throw new Error('Invalid Family ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(requestingUserId)) {
        throw new Error('Invalid Requesting User ID format');
    }

    // 2. Validate Update Data (ensure at least one field is being updated)
    if (Object.keys(updateData).length === 0) {
        throw new Error('No update data provided.');
    }
    if (updateData.name !== undefined && updateData.name.trim() === '') {
        throw new Error('Family name cannot be empty.');
    }

    // 3. Find the family first to check permission
    const family = await Family.findById(familyId).select('createdBy').exec(); // Select only createdBy for check
    if (!family) {
        throw new Error('Family not found');
    }

    // 4. Permission Check: Only creator can update (for now)
    if (!family.createdBy || String(family.createdBy) !== String(requestingUserId)) {
        const permissionError = new Error('Only the family creator can update family details');
        (permissionError as any).statusCode = 403;
        throw permissionError;
    }

    // 5. Find and update the family
    const updatedFamily = await Family.findByIdAndUpdate(
        familyId,
        { $set: updateData }, // Use $set to apply partial updates
        { new: true, runValidators: true } // Return updated doc, run schema validators
    )
    .populate('createdBy', 'firstName lastName email') 
    .populate('members.userId', 'firstName lastName email profilePicture')
    .exec();

    return updatedFamily; // Returns null if findByIdAndUpdate fails to find the doc
};

// Service to delete a family
export const deleteFamily = async (
    familyId: string | mongoose.Types.ObjectId,
    requestingUserId: string | mongoose.Types.ObjectId
): Promise<IFamily | null> => { // Returns the deleted family or null

    // 1. Validate IDs
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
        throw new Error('Invalid Family ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(requestingUserId)) {
        throw new Error('Invalid Requesting User ID format');
    }

    // 2. Find the family first to check permission
    const family = await Family.findById(familyId).select('createdBy').exec(); // Select only createdBy for check
    if (!family) {
        throw new Error('Family not found'); // Or return null? Let's throw for controller
    }

    // 3. Permission Check: Only creator can delete (for now)
    if (!family.createdBy || String(family.createdBy) !== String(requestingUserId)) {
        const permissionError = new Error('Only the family creator can delete the family');
        (permissionError as any).statusCode = 403;
        throw permissionError;
    }

    // 4. Check for associated tasks
    // TODO: Implement proper cascading delete or archival later.
    // For now, prevent deletion if tasks exist for safety.
    const taskCount = await Task.countDocuments({ familyId: familyId });
    if (taskCount > 0) {
        const deletePreventedError = new Error(
            `Cannot delete family: ${taskCount} task(s) are still associated with it. Please delete or reassign tasks first.`
        );
        (deletePreventedError as any).statusCode = 400; // Bad Request - action cannot be completed
        throw deletePreventedError;
    }

    // 5. Delete the family
    const deletedFamily = await Family.findByIdAndDelete(familyId).exec();

    return deletedFamily; // Returns the deleted document or null if not found by findByIdAndDelete
};

// Interface for removing a member
interface RemoveMemberData {
    familyId: string | mongoose.Types.ObjectId;
    memberIdToRemove: string | mongoose.Types.ObjectId; // User ID of the member being removed
    requestingUserId: string | mongoose.Types.ObjectId; // User performing the action
}

// Service to remove a member from a family
export const removeMemberFromFamily = async (data: RemoveMemberData): Promise<IFamily> => {
    const { familyId, memberIdToRemove, requestingUserId } = data;

    // 1. Validate IDs
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
        throw new Error('Invalid Family ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(memberIdToRemove)) {
        throw new Error('Invalid Member User ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(requestingUserId)) {
        throw new Error('Invalid Requesting User ID format');
    }

    // 2. Find the family
    const family = await Family.findById(familyId).exec();
    if (!family) {
        throw new Error('Family not found');
    }

    // 3. Permission Check: Only creator can remove members (for now)
    //    Also, creator cannot remove themselves via this method.
    if (!family.createdBy || String(family.createdBy) !== String(requestingUserId)) {
        const permissionError = new Error('Only the family creator can remove members');
        (permissionError as any).statusCode = 403;
        throw permissionError;
    }
    if (String(memberIdToRemove) === String(requestingUserId)) {
         const selfRemovalError = new Error('Family creator cannot remove themselves.');
        (selfRemovalError as any).statusCode = 400;
        throw selfRemovalError;
    }

    // 4. Find the index of the member to remove
    const memberIndex = family.members.findIndex(
        member => member.userId && String(member.userId) === String(memberIdToRemove)
    );

    if (memberIndex === -1) {
        throw new Error('Member not found in this family.');
    }

    // 5. Remove the member using splice
    family.members.splice(memberIndex, 1);

    // 6. Save the updated family document
    await family.save();

    // 7. Populate and return the updated family (optional, but good for response)
    await family.populate('members.userId', 'firstName lastName email profilePicture');

    return family;
};

// Interface for creating an invitation
interface CreateInvitationData {
    familyId: string | mongoose.Types.ObjectId;
    emailToInvite: string;
    role: string;
    requestingUserId: string | mongoose.Types.ObjectId; // User initiating the invite
}

// Service to create and store an invitation
export const createInvitation = async (data: CreateInvitationData): Promise<IInvitation> => {
    const { familyId, emailToInvite, role, requestingUserId } = data;

    // 1. Validate IDs and Email Format
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
        throw new Error('Invalid Family ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(requestingUserId)) {
        throw new Error('Invalid Requesting User ID format');
    }
    const lowercasedEmail = emailToInvite.toLowerCase().trim();
    if (!/\S+@\S+\.\S+/.test(lowercasedEmail)) {
        throw new Error('Invalid email format for user to invite');
    }
    // TODO: Add role validation against allowed roles

    // 2. Find the family and check permissions
    const family = await Family.findById(familyId).select('createdBy members.userId').exec();
    if (!family) {
        throw new Error('Family not found');
    }
    // Permission Check: Only creator can invite (using the same logic as addMember for now)
    if (!family.createdBy || String(family.createdBy) !== String(requestingUserId)) {
        const permissionError = new Error('Only the family creator can send invitations');
        (permissionError as any).statusCode = 403;
        throw permissionError;
    }

    // 3. Check if the email belongs to a user who is already a member
    const existingMember = await User.findOne({ email: lowercasedEmail }).select('_id').lean().exec();
    if (existingMember) {
        const isAlreadyMember = family.members.some(
            member => member.userId && String(member.userId) === String(existingMember._id)
        );
        if (isAlreadyMember) {
            throw new Error(`User with email ${lowercasedEmail} is already a member of this family.`);
        }
    }

    // 4. Check for existing *pending* invitation for this email/family
    const existingPendingInvite = await Invitation.findOne({
        familyId: familyId,
        email: lowercasedEmail,
        status: 'pending'
    }).exec();

    if (existingPendingInvite) {
        // Option 1: Resend (update expiry/token & resend email) - More complex
        // Option 2: Throw error (simpler for now)
        throw new Error(`An invitation is already pending for ${lowercasedEmail} for this family.`);
        // Consider allowing resend later.
    }

    // 5. Generate Token and Expiry
    const token = crypto.randomBytes(32).toString('hex'); // More secure token
    const expiryDays = 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    // 6. Create and save the invitation
    const invitation = new Invitation({
        familyId,
        email: lowercasedEmail,
        role,
        invitedBy: requestingUserId,
        token,
        expiresAt,
        status: 'pending',
    });

    // Add debug log before saving
    console.log(`DEBUG: Validating email value: "[${invitation.email}]"`);

    await invitation.save();

    // 7. Trigger email sending service
    try {
        // We need inviter name and family name for the email context
        // Fetch them efficiently if not already available (family was fetched earlier)
        const inviter = await User.findById(requestingUserId).select('firstName lastName email').lean();
        // Ensure family name is fetched or use family object if already populated
        // const familyName = family?.name || '[Unknown Family]'; // Assuming family object is available
        // Re-fetch family if name wasn't selected earlier
         const populatedFamily = await Family.findById(familyId).select('name').lean();
         const familyName = populatedFamily?.name || '[Unknown Family]';

        const inviterName = inviter?.firstName ? `${inviter.firstName} ${inviter.lastName || ''}`.trim() : inviter?.email || 'Someone';

        await sendInvitationEmail({
            toEmail: invitation.email,
            token: invitation.token,
            inviterName: inviterName,
            familyName: familyName,
            role: invitation.role
        });
    } catch (emailError) {
        // Log email error but don't fail the operation
        console.error(`Error sending invitation email to ${invitation.email}:`, emailError);
    }

    return invitation;
};

// Interface for accepting an invitation
interface AcceptInvitationData {
    invitationToken: string;
    loggedInUserId: string | mongoose.Types.ObjectId;
}

// Service for an existing logged-in user to accept an invitation
export const acceptInvitation = async (data: AcceptInvitationData): Promise<IFamily> => {
    const { invitationToken, loggedInUserId } = data;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Find and Validate Invitation
        const invitation = await Invitation.findOne({
            token: invitationToken,
            status: 'pending'
        }).session(session);

        if (!invitation) {
            throw new Error('Invalid or expired invitation token.');
        }
        if (invitation.expiresAt < new Date()) {
            invitation.status = 'expired';
            await invitation.save({ session });
            throw new Error('Invitation has expired.');
        }

        // 2. Find the Logged-in User and Verify Email Match
        const user = await User.findById(loggedInUserId).session(session);
        if (!user) {
            // Should not happen if protect middleware is working
            throw new Error('Logged-in user not found.'); 
        }
        if (user.email !== invitation.email) {
            throw new Error('Logged-in user email does not match the invitation email.');
        }

        // 3. Find the Target Family
        const family = await Family.findById(invitation.familyId).session(session);
        if (!family) {
            throw new Error('Family associated with invitation not found.');
        }

        // 4. Check if Already a Member
        const isAlreadyMember = family.members.some(
            member => member.userId && member.userId.equals(loggedInUserId)
        );
        if (isAlreadyMember) {
            // If already member, just accept the invite and return family
            invitation.status = 'accepted';
            await invitation.save({ session });
            await session.commitTransaction();
            session.endSession();
            // Populate necessary details before returning
            await family.populate('members.userId', 'firstName lastName email');
            return family;
            // Alternatively, throw an error: throw new Error('User is already a member of this family.');
        }

        // 5. Add User to Family
        family.members.push({
            userId: loggedInUserId as mongoose.Types.ObjectId,
            role: invitation.role,
            joinedAt: new Date(),
            permissions: [],
        });
        await family.save({ session });

        // 6. Update Invitation Status
        invitation.status = 'accepted';
        await invitation.save({ session });

        // 7. Commit Transaction
        await session.commitTransaction();
        
        // 8. Populate details before returning
        await family.populate('members.userId', 'firstName lastName email');

        return family;

    } catch (error) {
        await session.abortTransaction();
        console.error("Error during invitation acceptance:", error);
        throw error;
    } finally {
        session.endSession();
    }
};

// Service to get non-sensitive details about an invitation using its token
export const getInvitationDetailsByToken = async (token: string): Promise<PublicInvitationDetails | null> => {
    // Find the invitation by the token
    const invitation = await Invitation.findOne({ token: token })
    .populate('familyId', 'name') // Populate family name
    .populate('invitedBy', 'firstName lastName email') // Populate inviter details
    .lean(); // Use lean for faster read-only query

    if (!invitation) {
        throw new Error('Invitation not found, invalid, or already processed.');
    }

    // Check if a user already exists with this email
    const existingUser = await User.findOne({ email: invitation.email.toLowerCase() }).select('_id').lean().exec();
    const isExistingUser = !!existingUser;

    // Return only necessary non-sensitive details
    const familyName = (invitation.familyId as any)?.name || 'Unknown Family'; // Handle potential missing population

    const details: PublicInvitationDetails = {
        email: invitation.email,
        role: invitation.role,
        familyName: familyName,
        isExistingUser: isExistingUser, // Add the flag
    };

    return details;
};

// Interface for the registration and acceptance data
interface RegisterAndAcceptData {
    token: string;
    firstName: string;
    lastName: string;
    email: string; // Should match the invited email
    password: string;
}

// Service to register a new user AND accept an invitation
export const registerAndAcceptInvitation = async (data: RegisterAndAcceptData): Promise<{ user: ReturnedUser, token: string, family: IFamily }> => {
    const { token, firstName, lastName, email, password } = data;

    // 1. Validate the invitation token and basic details (email match, user existence)
    const publicDetails = await getInvitationDetailsByToken(token);
    if (!publicDetails) {
        const error = new Error('Invalid or expired invitation token.');
        (error as any).statusCode = 400;
        throw error;
    }
    if (publicDetails.email.toLowerCase() !== email.toLowerCase()) {
         const error = new Error('Registration email does not match the invited email.');
        (error as any).statusCode = 400;
        throw error;
    }
    if (publicDetails.isExistingUser) {
         const error = new Error('A user with this email already exists. Please log in to accept the invitation.');
        (error as any).statusCode = 409; // Conflict
        throw error;
    }

    // 1.5 Fetch the full invitation document needed for processing
    const invitation = await Invitation.findOne({ token: token, status: 'pending' }).exec();
    if (!invitation) {
        // This should be rare if getInvitationDetailsByToken passed, but handles edge cases/race conditions
        const error = new Error('Invitation cannot be processed (status changed or deleted).');
        (error as any).statusCode = 409; // Conflict
        throw error;
    }

    // 2. Check if user already exists (Redundant check, but safe)
    const existingUser = await User.findOne({ email: email.toLowerCase() }).exec();
    if (existingUser) { 
        // This block should technically not be reachable due to the isExistingUser check above
        console.warn('Conflict: User existed despite initial check in registerAndAcceptInvitation.');
         const error = new Error('A user with this email already exists.');
        (error as any).statusCode = 409; 
        throw error;
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create the new user
    const newUser = new User({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        isVerified: true // Mark as verified since they came via trusted invite link
    });
    await newUser.save();

    // 5. Find the family (using familyId from the full invitation doc)
    const family = await Family.findById(invitation.familyId).exec();
    if (!family) {
         // This should be rare if invitation is valid, but handle defensively
        await User.findByIdAndDelete(newUser._id); // Clean up partially created user
        const error = new Error('Family associated with the invitation not found.');
        (error as any).statusCode = 500;
        throw error;
    }

    // 6. Add user to the family
    const isAlreadyMember = family.members.some(
        member => member.userId && String(member.userId) === String(newUser._id)
    );
    if (!isAlreadyMember) {
        family.members.push({
            userId: newUser._id,
            role: invitation.role, // Use role from invitation
            joinedAt: new Date(),
        });
        await family.save();
    } else {
        // Should not happen if existingUser check passed, but log if it does
        console.warn(`User ${newUser.email} was already a member of family ${family._id} during invitation acceptance.`);
    }

    // 7. Update the invitation status (using invitation._id)
    await Invitation.findByIdAndUpdate(invitation._id, {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedByUserId: newUser._id // Link the user who accepted
    });

    // 8. Generate JWT for the new user
    const jwtToken = generateToken(newUser._id as mongoose.Types.ObjectId);

    // Fetch the user again to ensure populated fields are available if needed
    // Although population is not strictly needed for ReturnedUser fields here,
    // this ensures consistency if ReturnedUser interface changes later.
    const populatedUser = await User.findById(newUser._id).exec(); 
    
    if (!populatedUser) {
        // This check is mostly for type safety and unlikely to fail
        const error = new Error('Failed to retrieve newly created user after save.');
        (error as any).statusCode = 500;
        throw error;
    }

    // Populate family members for the returned family object
    await family.populate('members.userId', 'firstName lastName email profilePicture');

    // Construct the user object based on the ReturnedUser interface
    const returnedUser: ReturnedUser = {
        _id: populatedUser._id as mongoose.Types.ObjectId,
        firstName: populatedUser.firstName,
        lastName: populatedUser.lastName,
        email: populatedUser.email,
        profilePicture: populatedUser.profilePicture,
        isVerified: populatedUser.isVerified as boolean,
        // families: populatedUser.families // Not populating here to keep it simple
    };

    return {
        user: returnedUser,
        token: jwtToken,
        family: family // Return the updated family details
    };
};

// Interface for changing a member's role
interface ChangeMemberRoleData {
    familyId: string | mongoose.Types.ObjectId;
    memberIdToChange: string | mongoose.Types.ObjectId; // User ID of the member whose role is changing
    newRole: string; // The new role to assign
    requestingUserId: string | mongoose.Types.ObjectId; // User performing the action
}

// Allowed roles that can be assigned by an admin/creator
const ASSIGNABLE_ROLES = ['Admin', 'Member'];

// Service to change a member's role in a family
export const changeMemberRole = async (data: ChangeMemberRoleData): Promise<IFamily> => {
    const { familyId, memberIdToChange, newRole, requestingUserId } = data;

    // 1. Validate IDs and Role
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
        throw new Error('Invalid Family ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(memberIdToChange)) {
        throw new Error('Invalid Member User ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(requestingUserId)) {
        throw new Error('Invalid Requesting User ID format');
    }
    if (!ASSIGNABLE_ROLES.includes(newRole)) {
        const roleError = new Error(`Invalid role: ${newRole}. Must be one of ${ASSIGNABLE_ROLES.join(', ')}`);
        (roleError as any).statusCode = 400;
        throw roleError;
    }

    // 2. Find the family
    const family = await Family.findById(familyId).exec();
    if (!family) {
        throw new Error('Family not found');
    }

    // 3. Permission Check: Only creator can change roles (for now)
    //    Also, cannot change the role of the creator.
    if (!family.createdBy || String(family.createdBy) !== String(requestingUserId)) {
        const permissionError = new Error('Only the family creator can change member roles');
        (permissionError as any).statusCode = 403;
        throw permissionError;
    }
    if (String(memberIdToChange) === String(requestingUserId) || String(memberIdToChange) === String(family.createdBy)) {
         const selfChangeError = new Error('Cannot change the role of the family creator.');
        (selfChangeError as any).statusCode = 400;
        throw selfChangeError;
    }

    // 4. Find the member to update within the members array
    const memberToUpdate = family.members.find(
        member => member.userId && String(member.userId) === String(memberIdToChange)
    );

    if (!memberToUpdate) {
        throw new Error('Member not found in this family.');
    }
    
    // Prevent changing role FROM 'Primary User'
    if (memberToUpdate.role === 'Primary User') {
        const primaryUserError = new Error('Cannot change the role of the Primary User.');
        (primaryUserError as any).statusCode = 400;
        throw primaryUserError;
    }

    // 5. Update the member's role
    // Mongoose subdocuments don't automatically trigger parent save(), so we update directly
    // and rely on the parent family.save() call.
    memberToUpdate.role = newRole;
    // TODO: Update permissions array based on the new role if applicable
    // memberToUpdate.permissions = getPermissionsForRole(newRole);

    // Mark the members array as modified if necessary (sometimes needed for nested arrays)
    family.markModified('members');

    // 6. Save the updated family document
    await family.save();

    // 7. Populate and return the updated family (optional, but good for response)
    await family.populate('members.userId', 'firstName lastName email profilePicture');

    return family;
};

// TODO: Add service functions for:
// - Removing members

// TODO: Add service functions for:
// - Adding a member to a family (requires invitation/confirmation logic?)
// - Getting family details (populating members)
// - Updating family settings
// - Deleting a family (handle permissions) 