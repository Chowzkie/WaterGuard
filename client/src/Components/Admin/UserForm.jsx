/**
 * @file UserForm.jsx
 * @description A highly reusable and complex form component for creating and editing users.
 * It manages its own internal form state, validation logic, and includes several
 * specialized sub-components for a rich user experience.
 */

import React, { useState, useEffect, useRef } from 'react';
import { isEqual } from 'lodash';
import formStyles from '../../Styles/AdminStyle/UserForm.module.css';
import sharedStyles from '../../Styles/AdminStyle/SharedAdmin.module.css';
import { Eye, EyeOff, CheckCircle2, AlertCircle, X, ChevronDown, Info } from 'lucide-react';

// --- HELPER SUB-COMPONENTS FOR THE FORM ---

/**
 * @description Component for handling multiple text inputs as tags (e.g., for user roles).
 * @param {{ value: string[], onChange: (value: string[]) => void }} props
 */
const MultiRoleInput = ({ value, onChange }) => {
  const [inputValue, setInputValue] = useState('');

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

  const removeRole = (roleToRemove) => {
    onChange(value.filter(r => r !== roleToRemove));
  };

  return (
    <div>
      <label htmlFor="roles" className={formStyles.formLabel}>
        Roles (press Enter to add)
      </label>
      <div className={formStyles.multiRoleInputContainer}>
        {value.map(role => (
          <span key={role} className={formStyles.multiRoleTag}>
            {role}
            <button
              type="button"
              onClick={() => removeRole(role)}
              className={formStyles.multiRoleTagRemoveBtn}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          type="text"
          id="roles"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={formStyles.multiRoleInputField}
          placeholder={value.length === 0 ? 'e.g., Administrator' : ''}
        />
      </div>
    </div>
  );
};

/**
 * @description Component for a custom multi-select dropdown, used here for assigning devices.
 * @param {{
 * value: string[],
 * onChange: (value: string[]) => void,
 * availableDevices: { id: string, label: string, location: string }[]
 * }} props
 */
const MultiDeviceInput = ({ value, onChange, availableDevices = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const devicesToSelect = availableDevices.filter(d => !value.includes(d.id));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleAddDevice = (deviceId) => {
    if (deviceId && !value.includes(deviceId)) {
      onChange([...value, deviceId]);
    }
    setIsOpen(false);
  };

  const removeDevice = (deviceIdToRemove) => {
    onChange(value.filter(id => id !== deviceIdToRemove));
  };

  return (
    <div>
      <label htmlFor="devices" className={formStyles.formLabel}>Devices to Handle</label>
      <div className={formStyles.multiRoleInputContainer}>
        {value.map(deviceId => {
          const device = availableDevices.find(d => d.id === deviceId);
          return (
            <span key={deviceId} className={formStyles.multiRoleTag}>
              {device ? device.label : deviceId}
              <button type="button" onClick={() => removeDevice(deviceId)} className={formStyles.multiRoleTagRemoveBtn}>
                <X size={14} />
              </button>
            </span>
          );
        })}
        {devicesToSelect.length > 0 && (
          <div className={formStyles.customDropdownWrapper} ref={dropdownRef}>
            <div className={formStyles.dropdownTrigger} onClick={() => setIsOpen(!isOpen)}>
              <span>Add a device...</span>
              <ChevronDown className={`${formStyles.dropdownChevron} ${isOpen ? formStyles.dropdownChevronOpen : ''}`} />
            </div>
            {isOpen && (
              <ul className={formStyles.dropdownMenu}>
                {devicesToSelect.map(device => (
                  <li key={device.id} className={formStyles.dropdownItem} onClick={() => handleAddDevice(device.id)}>
                    <span className={formStyles.dropdownItemLabel}>{device.label}</span>
                    <span className={formStyles.dropdownItemLocation}>{device.location}</span>
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
 * @description A visual component to show password strength requirements and their status.
 * @param {{ password?: string }} props
 */
const PasswordStrengthIndicator = ({ password = '' }) => {
  if (!password) {
    return null;
  }

  const checks = {
    hasMinLength: password.length >= 8,
    hasLowerCase: /[a-z]/.test(password),
    hasUpperCase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&]/.test(password),
  };

  const Requirement = ({ met, text }) => (
    <div className={`${formStyles.passwordRequirement} ${met ? formStyles.passwordRequirementMet : ''}`}>
      {met ? <CheckCircle2 className={formStyles.passwordRequirementIcon} /> : <AlertCircle className={formStyles.passwordRequirementIcon} />}
      <span>{text}</span>
    </div>
  );

  return (
    <div className={formStyles.passwordIndicatorContainer}>
      <Requirement met={checks.hasMinLength} text="At least 8 characters" />
      <Requirement met={checks.hasLowerCase} text="One lowercase letter" />
      <Requirement met={checks.hasUpperCase} text="One uppercase letter" />
      <Requirement met={checks.hasNumber} text="One number" />
      <Requirement met={checks.hasSpecialChar} text="One special character (@$!%*?&)" />
    </div>
  );
};


// --- THE MAIN REUSABLE FORM COMPONENT ---

/**
 * @description The main form component for creating or editing a user.
 * @param {{
 * users: object[],
 * onSubmit: (formData: object) => void,
 * onCancel?: () => void,
 * initialData?: object,
 * isEditing?: boolean,
 * addToast: (message: string, type: 'success' | 'error') => void,
 * availableDevices: object[]
 * }} props
 */
const UserForm = ({ users = [], onSubmit, onCancel, initialData = {}, isEditing = false, addToast, availableDevices }) => {
  // A single state object holds all form field values.
  const [formData, setFormData] = useState({
    // Set default empty values to prevent crashes on create form
    firstName: '', middleName: '', lastName: '', username: '', phone: '',
    devices: [], roles: [], password: '',
    ...initialData
  });
  
  const [showPassword, setShowPassword] = useState(false);
  // MODIFICATION: Replace usernameError state with a more descriptive state object.
  const [usernameValidation, setUsernameValidation] = useState({ message: '', type: '' });
  const [isDirty, setIsDirty] = useState(false);

  // MODIFICATION: Update the useEffect to set both success and error messages.
  useEffect(() => {
    // Don't show a message if the input is empty
    if (!formData.username) {
      setUsernameValidation({ message: '', type: '' });
      return;
    }
    // Don't show availability message for invalid short usernames
    if (formData.username.length < 3) {
      setUsernameValidation({ message: '', type: '' });
      return;
    }

    const userExists = users.some(user => 
      user.username.toLowerCase() === formData.username.toLowerCase() && user.id !== formData.id
    );

    if (userExists) {
      setUsernameValidation({ message: 'Username is already in use.', type: 'error' });
    } else {
      setUsernameValidation({ message: 'Username is available.', type: 'success' });
    }
  }, [formData.username, users, formData.id]);
  
  // Effect to check if the form is "dirty" (has been changed) in edit mode.
  useEffect(() => {
    if (isEditing) {
      setIsDirty(!isEqual(initialData, formData));
    }
  }, [formData, initialData, isEditing]);

  // --- HANDLERS ---

  const handleChange = (e) => {
    setFormData(prevData => ({ ...prevData, [e.target.name]: e.target.value }));
  };
  const handleRolesChange = (newRoles) => {
    setFormData(prevData => ({ ...prevData, roles: newRoles }));
  };
  const handleDevicesChange = (newDevices) => {
    setFormData(prevData => ({ ...prevData, devices: newDevices }));
  };
  const isPasswordStrong = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);

  const validateForm = () => {
    const { firstName, lastName, username, phone, password, devices } = formData;
    
    const nameRegex = /^[a-zA-Z\s]*$/;
    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      addToast('Name fields can only contain letters and spaces.', 'error');
      return false;
    }

    if (username.length < 3 || username.length > 20) {
      addToast('Username must be between 3 and 20 characters.', 'error');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      addToast('Username can only contain letters, numbers, and underscores.', 'error');
      return false;
    }
    // MODIFICATION: Check validation state type before submitting
    if (usernameValidation.type === 'error') {
      addToast(usernameValidation.message, 'error');
      return false;
    }
    if (!/^(\+639|09)\d{9}$/.test(phone)) {
      addToast('Invalid Philippine phone number format.', 'error');
      return false;
    }
    
    // Check password strength only if it's a new user or the password has been changed.
    const passwordChanged = isEditing && password !== initialData.password;
    if (!isEditing || passwordChanged) {
      if (!isPasswordStrong(password)) {
        addToast('Password does not meet strength requirements.', 'error');
        return false;
      }
    }

    if (devices.length === 0) {
      addToast('User must be assigned to at least one device.', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const dataToSubmit = { ...formData };
      // If editing and the password hasn't changed, remove it before submitting.
      if (isEditing && dataToSubmit.password === initialData.password) {
        delete dataToSubmit.password;
      }
      onSubmit(dataToSubmit);
    }
  };

  // --- RENDER ---
  return (
    <form onSubmit={handleSubmit} className={formStyles.userForm}>
      <div className={formStyles.formGridTriple}>
        <div>
          <label htmlFor="firstName" className={formStyles.formLabel}>First Name</label>
          <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} required className={formStyles.formInput} />
        </div>
        <div>
          <label htmlFor="middleName" className={formStyles.formLabel}>Middle Name <span className={formStyles.optionalText}>(Optional)</span></label>
          <input type="text" name="middleName" id="middleName" value={formData.middleName} onChange={handleChange} className={formStyles.formInput} />
        </div>
        <div>
          <label htmlFor="lastName" className={formStyles.formLabel}>Last Name</label>
          <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} required className={formStyles.formInput} />
        </div>
      </div>

      <div className={formStyles.formGridDouble}>
        <div>
          <label htmlFor="username" className={formStyles.formLabel}>Username</label>
          <input type="text" name="username" id="username" value={formData.username} onChange={handleChange} required className={formStyles.formInput} />
          {usernameValidation.message && (
                <div className={`
                    ${formStyles.fieldInfoMessage}
                    ${usernameValidation.type === 'success' ? formStyles.fieldInfoMessageSuccess : ''}
                `}>
                    {usernameValidation.type === 'success' ? <CheckCircle2 size={14} /> : <Info size={14} />}
                    <span>{usernameValidation.message}</span>
                </div>
            )}
        </div>
        <div>
          <label htmlFor="phone" className={formStyles.formLabel}>Phone Number (PH)</label>
          <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className={formStyles.formInput} />
        </div>
      </div>

      <div className={formStyles.formGridDouble}>
        <MultiDeviceInput
          value={formData.devices}
          onChange={handleDevicesChange}
          availableDevices={availableDevices}
        />
        <MultiRoleInput
          value={formData.roles}
          onChange={handleRolesChange}
        />
      </div>

      <div>
        <label htmlFor="password" className={formStyles.formLabel}>Password</label>
        <div className={formStyles.passwordInputContainer}>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            required={!isEditing}
            placeholder={isEditing ? 'Enter new password to change' : ''}
            className={formStyles.formInput}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className={formStyles.passwordVisibilityBtn}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <PasswordStrengthIndicator password={formData.password} />
      </div>

      <div className={formStyles.formSubmitContainer}>
        {isEditing && (
            <button type="button" onClick={onCancel} className={`${sharedStyles.btn} ${sharedStyles.btnSecondary}`}>
                Cancel
            </button>
        )}
        <button 
            type="submit" 
            className={formStyles.formSubmitBtn}
            disabled={isEditing && !isDirty}
        >
          {isEditing ? 'Update Account' : 'Create Account'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;
