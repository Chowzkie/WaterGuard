import { createContext, useContext } from 'react';

const AlertsContext = createContext(null);

export const useAlerts = () => {
    const context = useContext(AlertsContext);
    if (!context) {
        throw new Error("useAlerts must be used within an AlertsProvider. Make sure your component is inside App.jsx's provider.");
    }
    return context;
};

export default AlertsContext;