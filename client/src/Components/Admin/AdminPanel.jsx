/**
 * @file AdminPanel.jsx
 * @description This component is the main layout and controller for the entire /admin/* section.
 * It holds all the primary state (users, toasts), manages data operations (create, update, delete),
 * and uses a nested <Routes> to render the appropriate child component based on the URL.
 */

import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import panelStyles from '../../Styles/AdminStyle/AdminPanel.module.css';
import sharedStyles from '../../Styles/AdminStyle/SharedAdmin.module.css';
import AlertsContext from '../../utils/AlertsContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// Child Component Imports
import AdminDashboard from './AdminDashboard';
import AdminManageUsers from './AdminManageUsers';
import AdminCreateUser from './AdminCreateUser';
import AdminEditUser from './AdminEditUser';

// Mock Data for demonstration purposes.
const initialUsers = [
  { id: 1, firstName: 'Juan', middleName: 'Reyes', lastName: 'Dela Cruz', username: 'juandc', phone: '09171234567', devices: ['ps01-dev'], roles: ['Field Technician', 'Auditor'], password: 'Password123!' },
  { id: 2, firstName: 'Maria', middleName: 'Santos', lastName: 'Clara', username: 'mariaclara', phone: '+639287654321', devices: ['ps02-dev'], roles: ['System Analyst'], password: 'Password456?' },
];

/**
 * @description A reusable Toast component for displaying notifications.
 * @param {{ message: string, type: 'success' | 'error', status: 'entering' | 'exiting', onClose: () => void }} props
 */
const Toast = ({ message, type, status, onClose }) => {
  const handleAnimationEnd = () => {
    if (status === 'exiting') {
      onClose();
    }
  };

  return (
    <div
      className={`
        ${sharedStyles.toast}
        ${type === 'success' ? sharedStyles.toastSuccess : sharedStyles.toastError}
        ${status === 'exiting' ? sharedStyles.toastOutRight : sharedStyles.toastIn}
      `}
      onAnimationEnd={handleAnimationEnd}
    >
      {type === 'success' ? <CheckCircle2 className={sharedStyles.toastIcon} /> : <AlertCircle className={sharedStyles.toastIcon} />}
      <span>{message}</span>
    </div>
  );
};


export default function AdminPanel() {
  const { devices, onAdminCreateUser, onAdminUpdateUser, onAdminDeleteUser } = useContext(AlertsContext);
  const [users, setUsers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const toastTimeouts = useRef({});

  useEffect(() => {
    setUsers(initialUsers);
  }, []);

  useEffect(() => {
    const timeouts = toastTimeouts.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
    if (toastTimeouts.current[id]) {
      clearTimeout(toastTimeouts.current[id]);
      delete toastTimeouts.current[id];
    }
  }, []);

  const startToastExit = useCallback((id) => {
    setToasts(currentToasts =>
      currentToasts.map(t => (t.id === id ? { ...t, status: 'exiting' } : t))
    );
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(currentToasts => [
      ...currentToasts.map(t => ({ ...t, status: 'exiting' })),
      { id, message, type, status: 'entering' }
    ]);
    toastTimeouts.current[id] = setTimeout(() => startToastExit(id), 4500);
  }, [startToastExit]);

  const handleCreateUser = useCallback((newUser) => {
    const userWithId = { ...newUser, id: Date.now() };
    setUsers(prevUsers => [
      userWithId,
      ...prevUsers
    ]);
    addToast('Account created successfully!', 'success');
    onAdminCreateUser(userWithId);
  }, [addToast, onAdminCreateUser]);

  /**
   * --- PASSWORD BUG FIX ---
   * This handler is updated to correctly merge submitted data with existing data.
   * This prevents the password from being erased from the state when it wasn't changed.
   * @param {object} updatedUserData - The user data submitted from the form. This might not include a password.
   */
  const handleUpdateUser = useCallback((updatedUserData) => {
    // Find the original user object for logging purposes.
    const originalUser = users.find(u => u.id === updatedUserData.id);
    
    // Pass the original and the submitted data to the logger.
    if (originalUser) {
        onAdminUpdateUser(originalUser, updatedUserData);
    }
    
    setUsers(prevUsers =>
      prevUsers.map(user => {
        if (user.id === updatedUserData.id) {
          // **THE FIX**: Create the new user state by merging the changes.
          // 1. Spread the existing `user` object to include all its properties (like the original password).
          // 2. Spread the `updatedUserData` object on top. If it has a new password, it will overwrite the old one.
          //    If it does NOT have a password, the original one from `user` will be preserved.
          return { ...user, ...updatedUserData };
        }
        return user;
      })
    );
    addToast('Account updated successfully!', 'success');
  }, [users, addToast, onAdminUpdateUser]);

  const handleDeleteUser = useCallback((userId) => {
    setUserToDelete(userId);
    setShowConfirmation(true);
  }, []);

  const confirmDelete = useCallback(() => {
    const userToDeleteObject = users.find(u => u.id === userToDelete);

    if (userToDeleteObject) {
        onAdminDeleteUser(userToDeleteObject);
    }

    setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete));
    addToast('Account deleted.', 'success');
    setShowConfirmation(false);
    setUserToDelete(null);
}, [userToDelete, users, addToast, onAdminDeleteUser]);

  const cancelDelete = useCallback(() => {
    setShowConfirmation(false);
    setUserToDelete(null);
  }, []);

  return (
    <>
      <div className={panelStyles.pageContainer}>
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route
            path="create"
            element={<AdminCreateUser users={users} onSubmit={handleCreateUser} addToast={addToast} availableDevices={devices} />}
          />
          <Route
            path="manage"
            element={<AdminManageUsers users={users} allDevices={devices} onDelete={handleDeleteUser} />}
          />
          <Route
            path="edit/:userId"
            element={<AdminEditUser users={users} onSubmit={handleUpdateUser} addToast={addToast} availableDevices={devices} />}
          />
        </Routes>
      </div>

      <div className={sharedStyles.toastContainerWrapper}>
        <div className={sharedStyles.toastContainer}>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      </div>

      {showConfirmation && (
        <div className={sharedStyles.modalOverlay}>
          <div className={sharedStyles.modal}>
            <h3 className={sharedStyles.modalTitle}>Confirm Deletion</h3>
            <p className={sharedStyles.modalText}>
              Are you sure you want to delete this account? This action cannot be undone.
            </p>
            <div className={sharedStyles.modalActions}>
              <button onClick={cancelDelete} className={`${sharedStyles.btn} ${sharedStyles.btnSecondary}`}>
                Cancel
              </button>
              <button onClick={confirmDelete} className={`${sharedStyles.btn} ${sharedStyles.btnDelete}`}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
