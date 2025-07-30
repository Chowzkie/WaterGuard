/**
 * @file AdminEditUser.jsx
 * @description A view component that wraps the reusable UserForm for editing an existing user.
 * It's responsible for fetching the correct user data and passing it to the form.
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import sharedStyles from '../../Styles/AdminStyle/SharedAdmin.module.css'; // Reusable styles
import UserForm from './UserForm'; // The actual form component

/**
 * @description Renders the view for editing an existing user.
 * @param {{
 * users: object[],
 * onSubmit: (updatedUser: object) => void,
 * addToast: (message: string, type: string) => void,
 * availableDevices: object[]
 * }} props - Props passed down from the parent AdminPanel component.
 */
const AdminEditUser = ({ users, onSubmit, addToast, availableDevices }) => {
  const navigate = useNavigate();
  const { userId } = useParams();

  const userToEdit = users.find(u => u.id === parseInt(userId, 10));

  /**
   * This handler is passed to the UserForm for submission.
   * It calls the main update handler from AdminPanel and then redirects the user.
   * @param {object} updatedUser - The updated user data from the form.
   */
  const handleFormSubmit = (updatedUser) => {
    onSubmit(updatedUser);
    navigate('/admin/manage');
  };
  
  /**
   * Handler for the cancel button in the form.
   * Navigates the user back to the manage users page without saving.
   */
  const handleCancel = () => {
    navigate('/admin/manage');
  };

  if (!userToEdit) {
    return (
        <div className={sharedStyles.viewContainer}>
            <p>User not found.</p>
        </div>
    );
  }

  return (
    <div className={sharedStyles.viewContainer}>
      <h2 className={sharedStyles.viewTitle}>Modify Account</h2>
      <p className={sharedStyles.viewSubtitle}>Update the details for @{userToEdit.username}.</p>
      {/*
       * The UserForm is configured for editing by passing several key props:
       * 1. `users`: The full list of users for validation purposes.
       * 2. `onCancel`: The handler for the new cancel button.
       * 3. `initialData`: Pre-fills the form fields with the existing user's data.
       * 4. `isEditing`: A boolean flag that tells the form to adapt its behavior.
       */}
      <UserForm
          users={users} 
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          initialData={userToEdit}
          isEditing={true}
          addToast={addToast}
          availableDevices={availableDevices}
      />
    </div>
  );
};

export default AdminEditUser;
