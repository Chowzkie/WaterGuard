/**
 * @file AdminDashboard.jsx
 * @description The main landing page for the admin section, displaying navigation cards.
 * It provides clear entry points for primary administrative tasks.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, ArrowLeft } from 'lucide-react';
import dashboardStyles from '../../Styles/AdminStyle/AdminDashboard.module.css'; // Component-specific styles
import sharedStyles from '../../Styles/AdminStyle/SharedAdmin.module.css'; // Reusable styles

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
 * @description A clickable card used for navigating to different admin sections.
 * @param {{
 * title: string,
 * description: string,
 * onClick: () => void,
 * icon: React.ReactNode
 * }} props - Props to configure the card's content and action.
 */
const DashboardCard = ({ title, description, onClick, icon }) => (
  // The entire card is clickable, triggering the onClick handler passed in props.
  <div onClick={onClick} className={dashboardStyles.dashboardCard}>
    <div className={dashboardStyles.dashboardCardIconContainer}>{icon}</div>
    <h3 className={dashboardStyles.dashboardCardTitle}>{title}</h3>
    <p className={dashboardStyles.dashboardCardDescription}>{description}</p>
  </div>
);

const AdminDashboard = () => {
  // `useNavigate` is a hook from react-router-dom that gives us a function
  // to programmatically navigate to different routes.
  const navigate = useNavigate();

  return (
    <>
      {/* This button navigates the user one level up, likely to a main app overview page. */}
      <BackButton onClick={() => navigate('/overview')} />
      <div className={dashboardStyles.dashboardContainer}>
        <h1 className={dashboardStyles.dashboardTitle}>Admin Panel</h1>
        <p className={dashboardStyles.dashboardSubtitle}>What would you like to do today?</p>
        <div className={dashboardStyles.dashboardGrid}>
          <DashboardCard
            title="Create New Account"
            description="Set up a new user profile with specific roles and permissions."
            // When clicked, this card navigates to the '/admin/create' route.
            onClick={() => navigate('/admin/create')}
            icon={<UserPlus size={32} />}
          />
          <DashboardCard
            title="Manage Existing Accounts"
            description="View, update, or remove current user accounts."
            // When clicked, this card navigates to the '/admin/manage' route.
            onClick={() => navigate('/admin/manage')}
            icon={<Users size={32} />}
          />
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;