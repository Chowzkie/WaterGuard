/**
 * @file AdminManageUsers.jsx
 * @description Displays a table of all users with actions to edit or delete them.
 * This component orchestrates the display of data and user actions.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import tableStyles from '../../Styles/AdminStyle/AdminManageUsers.module.css'; // Component-specific styles for the table
import sharedStyles from '../../Styles/AdminStyle/SharedAdmin.module.css'; // Reusable styles for buttons, titles

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
 * @description The user data table component. It is a "presentational" or "dumb" component
 * because its only job is to display the data it's given via props. It doesn't manage state.
 * @param {{
 * users: object[],
 * onEdit: (user: object) => void,
 * onDelete: (userId: number) => void,
 * allDevices: object[]
 * }} props
 */
const UserTable = ({ users, onEdit, onDelete, allDevices }) => (
  <div className={tableStyles.tableWrapper}>
    <table className={tableStyles.userTable}>
      <thead>
        <tr>
          <th>Name</th><th>Username</th><th>Roles</th><th>Devices</th><th>Phone</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {/* Map over the users array to create a table row for each user. */}
        {users.map((user) => (
          <tr key={user.id}>
            <td data-label="Name">{`${user.firstName} ${user.lastName}`}</td>
            <td data-label="Username">@{user.username}</td>
            <td data-label="Roles">
              {/* Display user roles as individual tags */}
              <div className={tableStyles.tableRolesContainer}>
                {user.roles.map((role) => (<span key={role} className={tableStyles.tableRoleTag}>{role}</span>))}
              </div>
            </td>
            <td data-label="Devices">
              {/* Find the device label from the `allDevices` list using the device ID */}
              <div className={tableStyles.tableRolesContainer}>
                {user.devices.map((deviceId) => {
                  const device = allDevices.find(d => d.id === deviceId);
                  return (<span key={deviceId} className={tableStyles.tableRoleTag}>{device ? device.label : deviceId}</span>);
                })}
              </div>
            </td>
            <td data-label="Phone">{user.phone}</td>
            <td data-label="Actions">
              <div className={tableStyles.tableActions}>
                {/* The onEdit function (passed from AdminManageUsers) is called with the full user object. */}
                <button onClick={() => onEdit(user)} className={`${sharedStyles.btn} ${sharedStyles.btnEdit}`}>Edit</button>
                {/* The onDelete function (passed from AdminPanel) is called with just the user's ID. */}
                <button onClick={() => onDelete(user.id)} className={`${sharedStyles.btn} ${sharedStyles.btnDelete}`}>Delete</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * @description The main component for the "Manage Users" page. It holds the logic for handling edits.
 * @param {{
 * users: object[],
 * allDevices: object[],
 * onDelete: (userId: number) => void
 * }} props
 */
const AdminManageUsers = ({ users, allDevices, onDelete }) => {
  const navigate = useNavigate();

  /**
   * Navigates to the dedicated edit page for a specific user.
   * This function is passed as the `onEdit` prop to the UserTable.
   * @param {object} user - The user object to be edited, received from the table row.
   */
  const handleEditClick = (user) => {
    // Programmatically navigates to the edit route, including the user's ID in the URL.
    navigate(`/admin/edit/${user.id}`);
  };

  return (
    <>
      <BackButton onClick={() => navigate('/admin')} />
      <div className={sharedStyles.viewContainer}>
        <h2 className={sharedStyles.viewTitle2}>Manage Existing Accounts</h2>
        {/*
         * Conditionally render the table.
         * If there are users in the array, display the UserTable.
         * Otherwise, display a "No user accounts found" message.
         */}
        {users.length > 0 ? (
          <UserTable
            users={users}
            onEdit={handleEditClick}
            onDelete={onDelete}
            allDevices={allDevices}
          />
        ) : (
          <p className={sharedStyles.viewSubtitle}>No user accounts found.</p>
        )}
      </div>
    </>
  );
};

export default AdminManageUsers;