import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Users,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
} from 'lucide-react';
import styles from '../../Styles/AdminStyle/AdminPanel.module.css';
// Import the context to access the global list of devices from App.jsx.
import AlertsContext from '../../utils/AlertsContext';

// --- Mock Data ---
// The `devices` field is now an array of strings (device IDs). This structure is backend-ready,
// representing a many-to-many relationship between users and devices.
const initialUsers = [
  { id: 1, firstName: 'Juan', middleName: 'Reyes', lastName: 'Dela Cruz', username: 'juandc', phone: '09171234567', devices: ['ps01-dev'], roles: ['Field Technician', 'Auditor'], password: 'Password123!' },
  { id: 2, firstName: 'Maria', middleName: 'Santos', lastName: 'Clara', username: 'mariaclara', phone: '+639287654321', devices: ['ps02-dev'], roles: ['System Analyst'], password: 'Password456?' },
  { id: 3, firstName: 'Pedro', middleName: 'Penduko', lastName: 'Santos', username: 'pedros', phone: '09998887766', devices: ['ps01-dev', 'ps03-dev'], roles: ['Maintenance'], password: 'Password789!' },
];

// ==========================================================================
//  Sub-Components
// ==========================================================================

/**
 * A reusable back button component for navigation.
 * @param {{ onClick: () => void }} props - Component props.
 * @param {() => void} props.onClick - The function to call when the button is clicked.
 */
const BackButton = ({ onClick }) => (
  <button onClick={onClick} className={styles.backButton}>
    <ArrowLeft className={styles.backButtonIcon} /> Back
  </button>
);

/**
 * A card component for the main dashboard choices.
 * @param {{ title: string, description: string, onClick: () => void, icon: React.ReactNode }} props - Component props.
 */
const DashboardCard = ({ title, description, onClick, icon }) => (
  <div onClick={onClick} className={styles.dashboardCard}>
    <div className={styles.dashboardCardIconContainer}>{icon}</div>
    <h3 className={styles.dashboardCardTitle}>{title}</h3>
    <p className={styles.dashboardCardDescription}>{description}</p>
  </div>
);

/**
 * A custom input for handling multiple role entries as tags.
 * @param {{ value: string[], onChange: (roles: string[]) => void }} props - Component props.
 * @param {string[]} props.value - The current array of roles.
 * @param {(roles: string[]) => void} props.onChange - Callback to update the roles array.
 */
const MultiRoleInput = ({ value, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  /**
   * Adds a new role when the Enter or comma key is pressed.
   * @param {React.KeyboardEvent<HTMLInputElement>} e - The keyboard event.
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newRole = inputValue.trim();
      if (newRole && !value.includes(newRole)) {
        onChange([...value, newRole]);
      }
      setInputValue('');
    }
  };

  /**
   * Removes a specified role from the list.
   * @param {string} roleToRemove - The role string to be removed.
   */
  const removeRole = (roleToRemove) => {
    onChange(value.filter((role) => role !== roleToRemove));
  };

  return (
    <div>
      <label htmlFor="roles" className={styles.formLabel}>
        Roles (press Enter to add)
      </label>
      <div className={styles.multiRoleInputContainer}>
        {value.map((role) => (
          <span key={role} className={styles.multiRoleTag}>
            {role}
            <button type="button" onClick={() => removeRole(role)} className={styles.multiRoleTagRemoveBtn}>
              <X className={styles.multiRoleTagRemoveIcon} />
            </button>
          </span>
        ))}
        <input type="text" id="roles" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} className={styles.multiRoleInputField} placeholder={value.length === 0 ? 'e.g., Administrator' : ''} />
      </div>
    </div>
  );
};

// ==========================================================================
//  Custom Dropdown for Device Selection
// ==========================================================================
/**
 * A custom-built dropdown component for selecting multiple devices.
 * This replaces the default <select> element for better styling and user experience.
 * @param {{
 * value: string[],
 * onChange: (devices: string[]) => void,
 * availableDevices: {id: string, label: string, location: string}[]
 * }} props
 */
const MultiDeviceInput = ({ value, onChange, availableDevices = [] }) => {
  // State to manage whether the dropdown menu is currently visible.
  const [isOpen, setIsOpen] = useState(false);
  // A ref to the main container of the dropdown. Used to detect clicks outside the component.
  const dropdownRef = useRef(null);

  // Filters the full list of devices to get only those that haven't been selected yet.
  const devicesToSelect = availableDevices.filter(
    (device) => !value.includes(device.id)
  );

  /**
   * This effect adds an event listener to the whole document to detect clicks.
   * If a click happens outside the dropdown's container (referenced by dropdownRef),
   * it calls setIsOpen(false) to close the dropdown menu.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    // Bind the event listener when the component mounts.
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener when the component unmounts to prevent memory leaks.
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);


  /**
   * Adds a device to the user's list when an item in the dropdown is clicked.
   * @param {string} deviceId - The ID of the device to add.
   */
  const handleAddDevice = (deviceId) => {
    if (deviceId && !value.includes(deviceId)) {
      onChange([...value, deviceId]);
    }
    setIsOpen(false); // Close the dropdown after making a selection.
  };

  /**
   * Removes a device from the user's list when the 'X' on a tag is clicked.
   * @param {string} deviceIdToRemove - The ID of the device to remove.
   */
  const removeDevice = (deviceIdToRemove) => {
    onChange(value.filter((id) => id !== deviceIdToRemove));
  };

  return (
    <div>
      <label htmlFor="devices" className={styles.formLabel}>
        Devices to Handle
      </label>
      <div className={styles.multiRoleInputContainer}>
        {/* Render the currently selected devices as tags */}
        {value.map((deviceId) => {
          const device = availableDevices.find(d => d.id === deviceId);
          return (
            <span key={deviceId} className={styles.multiRoleTag}>
              {device ? device.label : deviceId}
              <button type="button" onClick={() => removeDevice(deviceId)} className={styles.multiRoleTagRemoveBtn}>
                <X className={styles.multiRoleTagRemoveIcon} />
              </button>
            </span>
          );
        })}

        {/* The custom dropdown is only rendered if there are devices available to be added. */}
        {devicesToSelect.length > 0 && (
          <div className={styles.customDropdownWrapper} ref={dropdownRef}>
            {/* This div acts as the trigger, looking like a form input. */}
            <div className={styles.dropdownTrigger} onClick={() => setIsOpen(!isOpen)}>
              <span>Add a device...</span>
              <ChevronDown className={`${styles.dropdownChevron} ${isOpen ? styles.dropdownChevronOpen : ''}`} />
            </div>

            {/* The dropdown menu is rendered conditionally based on the `isOpen` state. */}
            {isOpen && (
              <ul className={styles.dropdownMenu}>
                {devicesToSelect.map((device) => (
                  <li
                    key={device.id}
                    className={styles.dropdownItem}
                    onClick={() => handleAddDevice(device.id)}
                  >
                    <span className={styles.dropdownItemLabel}>{device.label}</span>
                    <span className={styles.dropdownItemLocation}>{device.location}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Displays password strength requirements and their current status.
 * @param {{ password?: string }} props - Component props.
 */
const PasswordStrengthIndicator = ({ password = '' }) => {
  if (!password) return null;

  const checks = {
    hasMinLength: password.length >= 8,
    hasLowerCase: /[a-z]/.test(password),
    hasUpperCase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&]/.test(password),
  };

  const Requirement = ({ met, text }) => (
    <div className={`${styles.passwordRequirement} ${met ? styles.passwordRequirementMet : ''}`}>
      {met ? <CheckCircle2 className={styles.passwordRequirementIcon} /> : <AlertCircle className={styles.passwordRequirementIcon} />}
      <span>{text}</span>
    </div>
  );

  return (
    <div className={styles.passwordIndicatorContainer}>
      <Requirement met={checks.hasMinLength} text="At least 8 characters" />
      <Requirement met={checks.hasLowerCase} text="One lowercase letter" />
      <Requirement met={checks.hasUpperCase} text="One uppercase letter" />
      <Requirement met={checks.hasNumber} text="One number" />
      <Requirement met={checks.hasSpecialChar} text="One special character (@$!%*?&)" />
    </div>
  );
};

/**
 * The main form for creating and editing user accounts.
 * @param {{
 * onSubmit: (formData: object) => void,
 * initialData?: object,
 * isEditing?: boolean,
 * addToast: (message: string, type: 'success' | 'error') => void,
 * availableDevices: object[]
 * }} props - Component props.
 */
const UserForm = ({ onSubmit, initialData = {}, isEditing = false, addToast, availableDevices }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    username: '',
    phone: '',
    devices: [],
    roles: [],
    password: '',
    ...initialData,
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRolesChange = (newRoles) => {
    setFormData((prev) => ({ ...prev, roles: newRoles }));
  };

  /**
   * A specific handler to update the devices array from the MultiDeviceInput.
   * @param {string[]} newDevices - The new array of device IDs.
   */
  const handleDevicesChange = (newDevices) => {
    setFormData((prev) => ({ ...prev, devices: newDevices }));
  };

  /**
   * Validates the form data based on defined rules.
   * @returns {boolean} - True if the form is valid, otherwise false.
   */
  const validateForm = () => {
    const username = formData.username;
    if (username.length < 3 || username.length > 20) {
      addToast('Username must be between 3 and 20 characters.', 'error');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      addToast('Username can only contain letters, numbers, and underscores.', 'error');
      return false;
    }
    if (!/^(\+639|09)\d{9}$/.test(formData.phone)) {
      addToast('Invalid Philippine phone number format.', 'error');
      return false;
    }
    if (!isEditing || (isEditing && formData.password)) {
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(formData.password)) {
        addToast('Password does not meet strength requirements.', 'error');
        return false;
      }
    }
    if (formData.devices.length === 0) {
      addToast('User must be assigned to at least one device.', 'error');
      return false;
    }
    return true;
  };

  /**
   * Handles the form submission, validates, and calls the onSubmit prop.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.userForm}>
      <div className={styles.formGridTriple}>
        <div>
          <label htmlFor="firstName" className={styles.formLabel}>First Name</label>
          <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} required className={styles.formInput} />
        </div>
        <div>
          <label htmlFor="middleName" className={styles.formLabel}>Middle Name</label>
          <input type="text" name="middleName" id="middleName" value={formData.middleName} onChange={handleChange} className={styles.formInput} />
        </div>
        <div>
          <label htmlFor="lastName" className={styles.formLabel}>Last Name</label>
          <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} required className={styles.formInput} />
        </div>
      </div>
      <div className={styles.formGridDouble}>
        <div>
          <label htmlFor="username" className={styles.formLabel}>Username</label>
          <input type="text" name="username" id="username" value={formData.username} onChange={handleChange} required className={styles.formInput} />
        </div>
        <div>
          <label htmlFor="phone" className={styles.formLabel}>Phone Number (PH)</label>
          <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className={styles.formInput} />
        </div>
      </div>
      <div className={styles.formGridDouble}>
        <MultiDeviceInput value={formData.devices} onChange={handleDevicesChange} availableDevices={availableDevices} />
        <MultiRoleInput value={formData.roles} onChange={handleRolesChange} />
      </div>
      <div>
        <label htmlFor="password" className={styles.formLabel}>Password</label>
        <div className={styles.passwordInputContainer}>
          <input type={showPassword ? 'text' : 'password'} name="password" id="password" value={formData.password} onChange={handleChange} required={!isEditing} placeholder={isEditing ? 'Enter new password to change' : ''} className={styles.formInput} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.passwordVisibilityBtn}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <PasswordStrengthIndicator password={formData.password} />
      </div>
      <div className={styles.formSubmitContainer}>
        <button type="submit" className={styles.formSubmitBtn}>
          {isEditing ? 'Update Account' : 'Create Account'}
        </button>
      </div>
    </form>
  );
};

/**
 * A component to display all users in a responsive table.
 * @param {{
 * users: object[],
 * onEdit: (user: object) => void,
 * onDelete: (userId: number) => void,
 * allDevices: object[]
 * }} props - Component props.
 */
const UserTable = ({ users, onEdit, onDelete, allDevices }) => (
  <div className={styles.tableWrapper}>
    <table className={styles.userTable}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Username</th>
          <th>Roles</th>
          <th>Devices</th>
          <th>Phone</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td data-label="Name">{`${user.firstName} ${user.lastName}`}</td>
            <td data-label="Username">@{user.username}</td>
            <td data-label="Roles">
              <div className={styles.tableRolesContainer}>
                {user.roles.map((role) => (<span key={role} className={styles.tableRoleTag}>{role}</span>))}
              </div>
            </td>
            <td data-label="Devices">
              <div className={styles.tableRolesContainer}>
                {user.devices.map((deviceId) => {
                  const device = allDevices.find(d => d.id === deviceId);
                  return (<span key={deviceId} className={styles.tableRoleTag}>{device ? device.label : deviceId}</span>);
                })}
              </div>
            </td>
            <td data-label="Phone">{user.phone}</td>
            <td data-label="Actions">
              <div className={styles.tableActions}>
                <button onClick={() => onEdit(user)} className={`${styles.btn} ${styles.btnEdit}`}>Edit</button>
                <button onClick={() => onDelete(user.id)} className={`${styles.btn} ${styles.btnDelete}`}>Delete</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * A notification toast component for success or error messages.
 * @param {{...}} props
 */
const Toast = ({ message, type, status, onClose }) => {
  const handleAnimationEnd = () => {
    if (status === 'exiting') {
      onClose();
    }
  };
  const animationClass = status === 'exiting' ? styles.toastOutRight : styles.toastIn;
  const typeClass = type === 'success' ? styles.toastSuccess : styles.toastError;
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`${styles.toast} ${typeClass} ${animationClass}`} onAnimationEnd={handleAnimationEnd}>
      <Icon className={styles.toastIcon} />
      <span>{message}</span>
    </div>
  );
};

/**
 * The main Admin Panel component that manages state, views, and user data.
 */
export default function AdminPanel() {
  const navigate = useNavigate();
  // Consume the AlertsContext to get the global list of devices from App.jsx.
  const { devices } = useContext(AlertsContext);

  // State for controlling the current view ('dashboard', 'create', 'edit', 'manage')
  const [view, setView] = useState('dashboard');
  // State for the list of users (simulates a database)
  const [users, setUsers] = useState([]);
  // State to hold the user object currently being edited
  const [editingUser, setEditingUser] = useState(null);
  // State for managing active toast notifications
  const [toasts, setToasts] = useState([]);
  // State for showing/hiding the delete confirmation modal
  const [showConfirmation, setShowConfirmation] = useState(false);
  // State to hold the ID of the user targeted for deletion
  const [userToDelete, setUserToDelete] = useState(null);
  // A ref to hold timeout IDs for toasts, preventing re-renders
  const toastTimeouts = useRef({});

  // This effect loads the initial mock data when the component first mounts.
  useEffect(() => {
    setUsers(initialUsers);
  }, []);

  // This effect cleans up any running toast timers when the component unmounts.
  useEffect(() => {
    const timeouts = toastTimeouts.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  /**
   * Removes a toast from the state completely. This is called by the Toast component
   * itself after its exit animation completes.
   * @param {number} id - The unique ID of the toast to remove.
   */
  const removeToast = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((t) => t.id !== id));
    if (toastTimeouts.current[id]) {
      clearTimeout(toastTimeouts.current[id]);
      delete toastTimeouts.current[id];
    }
  }, []);

  /**
   * Changes a toast's status to 'exiting' to trigger its slide-out animation.
   * @param {number} id - The unique ID of the toast to start exiting.
   */
  const startToastExit = useCallback((id) => {
    setToasts((currentToasts) =>
      currentToasts.map((t) =>
        t.id === id ? { ...t, status: 'exiting' } : t
      )
    );
  }, []);

  /**
   * Adds a new toast notification to the screen.
   * @param {string} message - The message to display.
   * @param {'success' | 'error'} [type='success'] - The type of toast.
   */
  const addToast = useCallback((message, type = 'success') => {
    const newToastId = Date.now();
    const newToast = { id: newToastId, message, type, status: 'entering' };
    setToasts((currentToasts) => [
      ...currentToasts.map(t => ({ ...t, status: 'exiting' })),
      newToast
    ]);
    toastTimeouts.current[newToastId] = setTimeout(() => {
      startToastExit(newToastId);
    }, 4500);
  }, [startToastExit]);

  /**
   * Handles the creation of a new user, adding them to the state.
   * @param {object} newUser - The new user data from the form.
   */
  const handleCreateUser = (newUser) => {
    setUsers((prev) => [{ ...newUser, id: Date.now() }, ...prev]);
    setView('manage');
    addToast('Account created successfully!', 'success');
  };

  /**
   * Handles updating an existing user's data in the state.
   * @param {object} updatedUser - The updated user data from the form.
   */
  const handleUpdateUser = (updatedUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setView('manage');
    setEditingUser(null);
    addToast('Account updated successfully!', 'success');
  };

  /**
   * Initiates the deletion process by showing the confirmation modal.
   * @param {number} userId - The ID of the user to delete.
   */
  const handleDeleteUser = (userId) => {
    setUserToDelete(userId);
    setShowConfirmation(true);
  };

  /**
   * Confirms and executes the user deletion from the state.
   */
  const confirmDelete = () => {
    setUsers((prev) => prev.filter((user) => user.id !== userToDelete));
    addToast('Account deleted successfully.', 'success');
    setShowConfirmation(false);
    setUserToDelete(null);
  };

  /**
   * Cancels the deletion process and hides the modal.
   */
  const cancelDelete = () => {
    setShowConfirmation(false);
    setUserToDelete(null);
  };

  /**
   * Sets the state to begin editing a specific user.
   * @param {object} user - The user object to be edited.
   */
  const handleEditClick = (user) => {
    setEditingUser(user);
    setView('edit');
  };

  /**
   * Renders the main content based on the current `view` state.
   * This acts as a simple router for the component.
   * @returns {React.ReactNode} The JSX for the current view.
   */
  const renderContent = () => {
    switch (view) {
      case 'create':
        return (
          <>
            <BackButton onClick={() => setView('dashboard')} />
            <div className={styles.viewContainer}>
              <h2 className={styles.viewTitle}>Create New User Account</h2>
              <p className={styles.viewSubtitle}>Fill in the details to set up a new account.</p>
              <UserForm onSubmit={handleCreateUser} addToast={addToast} availableDevices={devices} />
            </div>
          </>
        );
      case 'edit':
        return (
          <>
            <BackButton onClick={() => setView('manage')} />
            <div className={styles.viewContainer}>
              <h2 className={styles.viewTitle}>Modify Account</h2>
              <p className={styles.viewSubtitle}>Update the details for @{editingUser.username}.</p>
              <UserForm onSubmit={handleUpdateUser} initialData={editingUser} isEditing={true} addToast={addToast} availableDevices={devices} />
            </div>
          </>
        );
      case 'manage':
        return (
          <>
            <BackButton onClick={() => setView('dashboard')} />
            <div className={styles.viewContainer}>
              <h2 className={styles.viewTitle}>Manage Existing Accounts</h2>
              {users.length > 0 ? (
                <UserTable users={users} onEdit={handleEditClick} onDelete={handleDeleteUser} allDevices={devices} />
              ) : (
                <p className={styles.viewSubtitle}>No user accounts found.</p>
              )}
            </div>
          </>
        );
      default: // dashboard
        return (
          <>
            <BackButton onClick={() => navigate('/overview')} />
            <div className={styles.dashboardContainer}>
              <h1 className={styles.dashboardTitle}>Admin Panel</h1>
              <p className={styles.dashboardSubtitle}>What would you like to do today?</p>
              <div className={styles.dashboardGrid}>
                <DashboardCard title="Create New Account" description="Set up a new user profile with specific roles and permissions." onClick={() => setView('create')} icon={<UserPlus size={32} />} />
                <DashboardCard title="Manage Existing Accounts" description="View, update, or remove current user accounts." onClick={() => setView('manage')} icon={<Users size={32} />} />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <>
      <div className={styles.pageContainer}>{renderContent()}</div>
      <div className={styles.toastContainerWrapper}>
        <div className={styles.toastContainer}>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      </div>
      {showConfirmation && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Confirm Deletion</h3>
            <p className={styles.modalText}>Are you sure you want to delete this account? This action cannot be undone.</p>
            <div className={styles.modalActions}>
              <button onClick={cancelDelete} className={`${styles.btn} ${styles.btnSecondary}`}>Cancel</button>
              <button onClick={confirmDelete} className={`${styles.btn} ${styles.btnDelete}`}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
