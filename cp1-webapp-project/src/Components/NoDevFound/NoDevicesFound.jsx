import { HardDrive } from 'lucide-react';

// Optimized CSS-in-JS styles for a more compact component
const styles = {
  // Styles for the NoDevicesFound component itself
  noDevicesContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.5rem',
    border: '2px dashed #e2e8f0',
    backgroundColor: '#f8fafc',
    padding: '2rem', // Reduced padding for a more compact look
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: '0.75rem', // Reduced margin
    borderRadius: '9999px',
    backgroundColor: '#e2e8f0',
    padding: '0.75rem', // Reduced padding for the icon
  },
  icon: {
    height: '1.5rem', // Made icon smaller
    width: '1.5rem',  // Made icon smaller
    color: '#64748b',
  },
  heading: {
    fontSize: '1.125rem', // Slightly smaller heading
    fontWeight: '600',
    color: '#334155',
  },
  paragraph: {
    marginTop: '0.25rem',
    fontSize: '0.875rem',
    color: '#64748b',
  },

  // Styles for the example App container to demonstrate centering
  appWrapper: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    padding: '1rem',
  },
};

/**
 * A React component that displays a "No devices found" message.
 * It has its own intrinsic size and relies on a parent to be centered.
 */
const NoDevicesFound = () => {
  return (
    <div style={styles.noDevicesContainer}>
      <div style={styles.iconContainer}>
        <HardDrive style={styles.icon} />
      </div>
      <h3 style={styles.heading}>No Devices Found</h3>
      <p style={styles.paragraph}>
        Please connect a device or check your connection.
      </p>
    </div>
  );
};


export default NoDevicesFound;