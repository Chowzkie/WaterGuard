/**
 * @file AdminCreateUser.jsx
 * @description A view component that wraps the reusable UserForm for creating a new user.
 * Its primary role is to bridge the main AdminPanel state/logic with the UserForm.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import sharedStyles from '../../Styles/AdminStyle/SharedAdmin.module.css'; // Reusable styles
import UserForm from './UserForm'; // The actual form component

/**
 * @description A reusable back button component.
 * @param {{ onClick: () => void }} props - The function to call when the button is clicked.
 */
const BackButton = ({ onClick }) => (
  <button onClick={onClick} className={sharedStyles.backButton}>
    <ArrowLeft className={sharedStyles.backButtonIcon} /> Back
  </button>
);

/**
 * @description Renders the view for creating a new user.
 * @param {{
 * onSubmit: (newUser: object) => void,
 * addToast: (message: string, type: string) => void,
 * availableDevices: object[]
 * }} props - Props passed down from the parent AdminPanel component.
 */
const AdminCreateUser = ({ users, onSubmit, addToast, availableDevices }) => {
  const navigate = useNavigate();

  /**
   * This handler is passed to the UserForm's `onSubmit` prop.
   * It first calls the main `onSubmit` function from the parent (AdminPanel)
   * to update the global state, and then navigates the user to the management page.
   * @param {object} newUser - The user data object submitted from the UserForm.
   */
  const handleFormSubmit = (newUser) => {
    // Call the function passed from AdminPanel to actually create the user in the state.
    onSubmit(newUser);
    // After creation, redirect the user to the list of all users.
    navigate('/admin/manage');
  };

  return (
    <>
      {/* This button navigates the user back to the main admin dashboard. */}
      <BackButton onClick={() => navigate('/admin')} />
      <div className={sharedStyles.viewContainer}>
        <h2 className={sharedStyles.viewTitle}>Create New User Account</h2>
        <p className={sharedStyles.viewSubtitle}>Fill in the details to set up a new account.</p>
        {/*
         * The reusable UserForm is rendered here.
         * It receives the submit handler, toast function, and device list from this component's props,
         * which ultimately originate from the AdminPanel.
         * Note: The `users` prop is NOT passed here, so validation will not work.
         */}
        <UserForm
            users={users} 
            onSubmit={handleFormSubmit}
            addToast={addToast}
            availableDevices={availableDevices}
        />
      </div>
    </>
  );
};

export default AdminCreateUser;
