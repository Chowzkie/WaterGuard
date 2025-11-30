import React, { useState, useEffect, useRef } from 'react';
import styles from '../../Styles/ConfigurationSettings.module.css';
import GuidelinesModal from './GuidelinesModal';
import { WifiOff, ArrowLeft, Save, AlertTriangle, LoaderCircle, Check, ChevronDown, History, RefreshCw, PowerOff, HelpCircle, X, Link, ShieldAlert } from 'lucide-react';

/**
 * component to display a message when a setting is not configured.
 */
const NotConfiguredMessage = () => (
    <div className={styles['not-configured-message']}>
        <AlertTriangle size={18} />
        <p>This setting has not been configured for this device.</p>
    </div>
);

// --- Slide-in Validation Modal ---
const ValidationErrorModal = ({ message, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger slide-in animation after mount
        const timer = setTimeout(() => setIsVisible(true), 10);
        
        // Auto-dismiss after 5 seconds
        const autoClose = setTimeout(() => handleClose(), 5000);

        return () => {
            clearTimeout(timer);
            clearTimeout(autoClose);
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false); // Trigger slide-out
        setTimeout(onClose, 300); // Wait for animation to finish before unmounting
    };

    return (
        <div className={`${styles['validation-toast']} ${isVisible ? styles['visible'] : ''}`}>
            <div className={styles['validation-icon']}>
                <ShieldAlert size={24} />
            </div>
            <div className={styles['validation-content']}>
                <h4>Validation Error</h4>
                <p>{message}</p>
            </div>
            <button onClick={handleClose} className={styles['validation-close']}>
                <X size={18} />
            </button>
        </div>
    );
};

const ConfigurationSettings = ({ device, onSave, onBack }) => {
    // --- STATE MANAGEMENT ---

    const [validationError, setValidationError] = useState(null);
    const [originalConfigs, setOriginalConfigs] = useState(null);
    const [draftConfigs, setDraftConfigs] = useState(null);
    const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [openPanels, setOpenPanels] = useState({
        alerts: true, // Start with the main panel open
        logging: false,
        testing: false,
        shutoff: false,
    });
    const [showSyncPrompt, setShowSyncPrompt] = useState(false);
    const [mismatchData, setMismatchData] = useState(null);
    
    // --- Imbalance Modal State ---
    const [showImbalancePrompt, setShowImbalancePrompt] = useState(false);
    const [imbalanceDetails, setImbalanceDetails] = useState(null); 

    const initializedDeviceIdRef = useRef(null);
    
    // --- GUIDELINES MODAL STATE ---
    const [showGuidelines, setShowGuidelines] = useState(false);
    const [guidelinesSection, setGuidelinesSection] = useState(null); // Track which section to scroll to

    // --- LIFECYCLE HOOKS ---

    /**
     * Initializes component state when a new `device` is selected.
     * It creates deep copies of the device's configurations for both the 'original' and 'draft' states.
     * It also gracefully handles cases where a device has no pre-existing configuration data by defaulting to an empty object.
     */
     useEffect(() => {
        // Only reset the form if the actual device ID has changed.
        if (device && device._id !== initializedDeviceIdRef.current) {
            
            // --- Ensure nested objects exist ---
            // Create a deep copy
            let initialConfigs = device.configurations
                ? JSON.parse(JSON.stringify(device.configurations))
                : {};

            // Ensure all nested paths we access exist to prevent errors
            initialConfigs.thresholds = initialConfigs.thresholds || {};
            initialConfigs.thresholds.ph = initialConfigs.thresholds.ph || {};
            initialConfigs.thresholds.turbidity = initialConfigs.thresholds.turbidity || {};
            initialConfigs.thresholds.tds = initialConfigs.thresholds.tds || {};
            initialConfigs.thresholds.temp = initialConfigs.thresholds.temp || {};

            initialConfigs.controls = initialConfigs.controls || {};
            initialConfigs.controls.valveShutOff = initialConfigs.controls.valveShutOff || {};
            initialConfigs.controls.pumpCycleIntervals = initialConfigs.controls.pumpCycleIntervals || {};
            initialConfigs.controls.valveOpenOnNormal = initialConfigs.controls.valveOpenOnNormal || {};
            
            initialConfigs.logging = initialConfigs.logging || {};
            initialConfigs.logging.alertIntervals = initialConfigs.logging.alertIntervals || {};

            // Helper function to initialize boolean triggers.
            // This ensures that if the fields don't exist in the DB (for older devices),
            // they default to 'true' to maintain original functionality.
            const initBool = (obj, key) => {
                if (obj[key] === undefined) {
                    obj[key] = true; // Default to true (checked)
                }
            };
            
            // Initialize specific trigger flags for Valve Shutoff
            initBool(initialConfigs.controls.valveShutOff, 'triggerPH');
            initBool(initialConfigs.controls.valveShutOff, 'triggerTurbidity');
            initBool(initialConfigs.controls.valveShutOff, 'triggerTDS');
            
            // Initialize specific trigger flags for Valve Re-open
            initBool(initialConfigs.controls.valveOpenOnNormal, 'triggerPH');
            initBool(initialConfigs.controls.valveOpenOnNormal, 'triggerTurbidity');
            initBool(initialConfigs.controls.valveOpenOnNormal, 'triggerTDS');
            
            setOriginalConfigs(initialConfigs);
            setDraftConfigs(initialConfigs);
            setSaveSuccess(false); 
            
            // Update the ref to remember the ID of the device we just loaded
            initializedDeviceIdRef.current = device._id;
        }
    }, [device]);

    // --- UTILITY & EVENT HANDLERS ---
    
    /**
     * @function handleTogglePanel - Toggles the open/closed state of a specific panel.
     * @param {string} panelName - The key of the panel to toggle (e.g., 'alerts').
     */
    const handleTogglePanel = (panelName) => {
        setOpenPanels(prev => ({ ...prev, [panelName]: !prev[panelName] }));
    };

    /**
     * @function hasUnsavedChanges
     * @returns {boolean} - True if `draftConfigs` is different from `originalConfigs`.
     * This is used to enable/disable the "Save" button.
     */
    const hasUnsavedChanges = () => {
        if (!draftConfigs || !originalConfigs) return false;
        return JSON.stringify(originalConfigs) !== JSON.stringify(draftConfigs);
    };

    /**
     * @function handleDeepChange
     * @description A versatile handler for updating nested state properties.
     * @param {string[]} path - An array of keys representing the path to the value.
     * @param {*} value - The new value to set.
     */
    const handleDeepChange = (path, value) => {
        setDraftConfigs(prev => {
            const newConfigs = JSON.parse(JSON.stringify(prev)); // Deep copy to avoid bugs
            let current = newConfigs;
            for (let i = 0; i < path.length - 1; i++) {
                // Create nested objects if they don't exist
                current[path[i]] = current[path[i]] || {};
                current = current[path[i]];
            }
            current[path[path.length - 1]] = value;
            return newConfigs;
        });
    };

    // --- VALIDATION ALGORITHMS ---

    /**
     * Generates a corrected configuration object by enforcing standard logic.
     * Logic: Enforce strict ascending order (CritLow < WarnLow < NormLow < NormHigh < WarnHigh < CritHigh)
     */
    const generateOptimizedConfigs = (currentConfigs) => {
        const optimized = JSON.parse(JSON.stringify(currentConfigs));
        const th = optimized.thresholds;

        // Helper to ensure A < B. If not, B = A + delta
        const ensureLess = (valA, valB, setB, delta = 0.1) => {
            if (valA >= valB) setB(parseFloat((valA + delta).toFixed(2)));
        };

        // 1. Optimize pH
        if (th.ph) {
            let { critLow, warnLow, normalLow, normalHigh, warnHigh, critHigh } = th.ph;
            // Enforce chain from bottom up
            ensureLess(critLow, warnLow, (v) => th.ph.warnLow = v);
            ensureLess(th.ph.warnLow, normalLow, (v) => th.ph.normalLow = v);
            ensureLess(th.ph.normalLow, normalHigh, (v) => th.ph.normalHigh = v);
            ensureLess(th.ph.normalHigh, warnHigh, (v) => th.ph.warnHigh = v);
            ensureLess(th.ph.warnHigh, critHigh, (v) => th.ph.critHigh = v);
        }

        // 2. Optimize Temp
        if (th.temp) {
            let { critLow, warnLow, normalLow, normalHigh, warnHigh, critHigh } = th.temp;
            ensureLess(critLow, warnLow, (v) => th.temp.warnLow = v);
            ensureLess(th.temp.warnLow, normalLow, (v) => th.temp.normalLow = v);
            ensureLess(th.temp.normalLow, normalHigh, (v) => th.temp.normalHigh = v);
            ensureLess(th.temp.normalHigh, warnHigh, (v) => th.temp.warnHigh = v);
            ensureLess(th.temp.warnHigh, critHigh, (v) => th.temp.critHigh = v);
        }

        // 3. Optimize Turbidity (Single direction: NormLow < NormHigh < Warn < Crit)
        if (th.turbidity) {
            let { normalLow, normalHigh, warn, crit } = th.turbidity;
            ensureLess(normalLow, normalHigh, (v) => th.turbidity.normalHigh = v, 1);
            ensureLess(th.turbidity.normalHigh, warn, (v) => th.turbidity.warn = v, 1);
            ensureLess(th.turbidity.warn, crit, (v) => th.turbidity.crit = v, 1);
        }

        // 4. Optimize TDS (Single direction)
        if (th.tds) {
            let { normalLow, normalHigh, warn, crit } = th.tds;
            ensureLess(normalLow, normalHigh, (v) => th.tds.normalHigh = v, 10);
            ensureLess(th.tds.normalHigh, warn, (v) => th.tds.warn = v, 10);
            ensureLess(th.tds.warn, crit, (v) => th.tds.crit = v, 10);
        }

        return optimized;
    };

    /**
     * Checks for logical imbalances in the thresholds.
     * Returns object with details if issues found, else null.
     */
    const checkThresholdImbalance = (configs) => {
        const issues = [];
        const th = configs.thresholds;

        // Check pH
        if (th.ph) {
            const { critLow, warnLow, normalLow, normalHigh, warnHigh, critHigh } = th.ph;
            const phIssues = [];
            if (warnLow <= critLow) phIssues.push(`Warning Low (${warnLow}) must be > Critical Low (${critLow})`);
            if (normalLow <= warnLow) phIssues.push(`Normal Low (${normalLow}) must be > Warning Low (${warnLow})`);
            if (normalHigh <= normalLow) phIssues.push(`Normal High (${normalHigh}) must be > Normal Low (${normalLow})`);
            if (warnHigh <= normalHigh) phIssues.push(`Warning High (${warnHigh}) must be > Normal High (${normalHigh})`);
            if (critHigh <= warnHigh) phIssues.push(`Critical High (${critHigh}) must be > Warning High (${warnHigh})`);
            
            if (phIssues.length > 0) issues.push({ param: 'pH Level', list: phIssues });
        }

        // Check Turbidity
        if (th.turbidity) {
            const { normalLow, normalHigh, warn, crit } = th.turbidity;
            const turbIssues = [];
            if (normalHigh <= normalLow) turbIssues.push(`Normal High (${normalHigh}) must be > Normal Low (${normalLow})`);
            if (warn <= normalHigh) turbIssues.push(`Warning (${warn}) must be > Normal High (${normalHigh})`);
            if (crit <= warn) turbIssues.push(`Critical (${crit}) must be > Warning (${warn})`);

            if (turbIssues.length > 0) issues.push({ param: 'Turbidity', list: turbIssues });
        }

        // Check TDS
        if (th.tds) {
             const { normalLow, normalHigh, warn, crit } = th.tds;
             const tdsIssues = [];
             if (normalHigh <= normalLow) tdsIssues.push(`Normal High (${normalHigh}) must be > Normal Low (${normalLow})`);
             if (warn <= normalHigh) tdsIssues.push(`Warning (${warn}) must be > Normal High (${normalHigh})`);
             if (crit <= warn) tdsIssues.push(`Critical (${crit}) must be > Warning (${warn})`);
 
             if (tdsIssues.length > 0) issues.push({ param: 'TDS', list: tdsIssues });
        }

        // Check Temp
        if (th.temp) {
            const { critLow, warnLow, normalLow, normalHigh, warnHigh, critHigh } = th.temp;
            const tempIssues = [];
            if (warnLow <= critLow) tempIssues.push(`Warning Low <= Critical Low`);
            if (normalLow <= warnLow) tempIssues.push(`Normal Low <= Warning Low`);
            if (normalHigh <= normalLow) tempIssues.push(`Normal High <= Normal Low`);
            if (warnHigh <= normalHigh) tempIssues.push(`Warning High <= Normal High`);
            if (critHigh <= warnHigh) tempIssues.push(`Critical High <= Warning High`);
            
            if (tempIssues.length > 0) issues.push({ param: 'Temperature', list: tempIssues });
        }

        if (issues.length > 0) {
            return {
                issues,
                optimizedConfig: generateOptimizedConfigs(configs)
            };
        }
        return null;
    };

    // --- SYNC HANDLER ---

    /**
     * @function handleSyncAllFromAlerts
     * @description Copies all critical alert thresholds TO the valve shut-off thresholds.
     */
    const handleSyncAllFromAlerts = () => {
        setDraftConfigs(prev => {
            const newConfigs = JSON.parse(JSON.stringify(prev));

            // Copy values FROM Alerts TO Shutoff
            newConfigs.controls.valveShutOff.phLow = newConfigs.thresholds.ph.critLow;
            newConfigs.controls.valveShutOff.phHigh = newConfigs.thresholds.ph.critHigh;
            newConfigs.controls.valveShutOff.turbidityCrit = newConfigs.thresholds.turbidity.crit;
            newConfigs.controls.valveShutOff.tdsCrit = newConfigs.thresholds.tds.crit;

            return newConfigs;
        });
    };

   

    // Validation function to check parameter selection rules
    /**
     * @function validateParameterSelection
     * @description Checks if at least one parameter is selected if the master switch is enabled.
     * @returns {boolean} - True if validation passes, false otherwise.
     */
    const validateParameterSelection = () => {
        const shutOff = draftConfigs.controls.valveShutOff;
        const reOpen = draftConfigs.controls.valveOpenOnNormal;

        // Rule: If Shut-off is Enabled, at least one shut-off trigger must be true
        if (shutOff.enabled && !(shutOff.triggerPH || shutOff.triggerTurbidity || shutOff.triggerTDS)) {
            // Using alert() here because we are not in a React render prop.
            // A more robust solution would be a modal or error message state.
           setValidationError("'Auto Shut-off' is enabled, but no parameters (pH, Turbidity, TDS) are selected to trigger it.");
            return false;
        }

        // Rule: If Re-open is Enabled, at least one re-open trigger must be true
        if (reOpen.enabled && !(reOpen.triggerPH || reOpen.triggerTurbidity || reOpen.triggerTDS)) {
           setValidationError("'Auto Re-open' is enabled, but no parameters (pH, Turbidity, TDS) are selected to monitor.");
            return false;
        }

        // All rules passed
        setValidationError(null); // Clear errors if valid
        return true;
    };

     // --- SAVE LOGIC ---
    /**
     * @function proceedWithSave
     * @description The actual save operation, now separated to be called from multiple places.
     * @param {object} configsToSave - The configuration object to be saved.
     */
    const proceedWithSave = async (configsToSave) => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await onSave(device._id, configsToSave);
            // Update the baseline "original" configs to this new saved state
            setOriginalConfigs(JSON.parse(JSON.stringify(configsToSave)));
            setDraftConfigs(JSON.parse(JSON.stringify(configsToSave))); // Ensure draft is also in sync
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error("Failed to save configurations:", error);
            setValidationError("Error: Could not save settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Main internal function to route the save process through all validation layers (Imbalance -> Sync -> Save).
     * @param {object} configs - The configurations to validate/save
     * @param {boolean} skipImbalanceCheck - If true, bypasses the imbalance check (used after "Ignore" or "Optimize")
     */
    const triggerSaveFlow = (configs, skipImbalanceCheck = false) => {
        // 1. Validate Logic Imbalance (Unless skipped)
        if (!skipImbalanceCheck) {
            const imbalance = checkThresholdImbalance(configs);
            if (imbalance) {
                setImbalanceDetails(imbalance);
                setShowImbalancePrompt(true);
                return; // STOP here, wait for Modal
            }
        }

        // 2. Validate Sync Mismatch (Original Logic)
        const alerts = configs.thresholds;
        const shutoff = configs.controls.valveShutOff;

        // Define the values to compare
        const values = {
            phLow: {
                alert: alerts.ph.critLow,
                shutoff: shutoff.phLow,
                isMismatched: alerts.ph.critLow !== shutoff.phLow
            },
            phHigh: {
                alert: alerts.ph.critHigh,
                shutoff: shutoff.phHigh,
                isMismatched: alerts.ph.critHigh !== shutoff.phHigh
            },
            turbidity: {
                alert: alerts.turbidity.crit,
                shutoff: shutoff.turbidityCrit,
                isMismatched: alerts.turbidity.crit !== shutoff.turbidityCrit
            },
            tds: {
                alert: alerts.tds.crit,
                shutoff: shutoff.tdsCrit,
                isMismatched: alerts.tds.crit !== shutoff.tdsCrit
            }
        };

        const hasMismatch = Object.values(values).some(v => v.isMismatched);

        if (hasMismatch) {
            setMismatchData(values); // Store the detailed mismatch data
            setShowSyncPrompt(true); // Show the sync modal
            return; // Stop here, wait for modal
        } 

        // 3. If all clear, Save
        proceedWithSave(configs);
    };

    /**
     * @function handleSaveClick - Handles the main "Save Configurations" button click.
     */
    const handleSaveClick = () => {
        if (isSaving) return;

        // 1. Run parameter selection validation first
        if (!validateParameterSelection()) {
            return; // Stop save if validation fails.
        }

        // 2. Trigger the full save flow (Imbalance -> Mismatch -> Save)
        triggerSaveFlow(draftConfigs);
    };


    // --- IMBALANCE MODAL HANDLERS ---

    const handleOptimizeAndSave = () => {
        // 1. Apply optimized configs
        setDraftConfigs(imbalanceDetails.optimizedConfig);
        setShowImbalancePrompt(false);
        
        // 2. Immediately try to save again with the NEW optimized configs
        // We pass a flag 'true' to indicate we skipped the imbalance check this time
        triggerSaveFlow(imbalanceDetails.optimizedConfig, true);
    };

    const handleIgnoreImbalance = () => {
        setShowImbalancePrompt(false);
        // Proceed with the ORIGINAL draft configs, skipping imbalance check
        triggerSaveFlow(draftConfigs, true);
    };

    const handleDiscardImbalance = () => {
        setShowImbalancePrompt(false);
        setImbalanceDetails(null);
        // Do nothing, user stays on page to fix manually
    };


    /**
     * @function handleSaveWithoutSyncing - Modal Action: Save the mismatched values as-is.
     */
    const handleSaveWithoutSyncing = () => {
        setShowSyncPrompt(false);
        proceedWithSave(draftConfigs); // Save the draft configs, mismatches and all
    };

    /**
     * @function handleSyncAlertsToShutoff - Modal Action: Copy Alert values TO Shutoff values, then save.
     */
    const handleSyncAlertsToShutoff = () => {
        const newConfigs = JSON.parse(JSON.stringify(draftConfigs));
        
        // Copy values FROM Alerts TO Shutoff
        newConfigs.controls.valveShutOff.phLow = newConfigs.thresholds.ph.critLow;
        newConfigs.controls.valveShutOff.phHigh = newConfigs.thresholds.ph.critHigh;
        newConfigs.controls.valveShutOff.turbidityCrit = newConfigs.thresholds.turbidity.crit;
        newConfigs.controls.valveShutOff.tdsCrit = newConfigs.thresholds.tds.crit;

        setDraftConfigs(newConfigs); // Update state
        setShowSyncPrompt(false);
        proceedWithSave(newConfigs); // Save the newly synced configs
    };

    /**
     * @function handleSyncShutoffToAlerts - Modal Action: Copy Shutoff values TO Alert values, then save.
     */
    const handleSyncShutoffToAlerts = () => {
        const newConfigs = JSON.parse(JSON.stringify(draftConfigs));

        // Copy values FROM Shutoff TO Alerts
        newConfigs.thresholds.ph.critLow = newConfigs.controls.valveShutOff.phLow;
        newConfigs.thresholds.ph.critHigh = newConfigs.controls.valveShutOff.phHigh;
        newConfigs.thresholds.turbidity.crit = newConfigs.controls.valveShutOff.turbidityCrit;
        newConfigs.thresholds.tds.crit = newConfigs.controls.valveShutOff.tdsCrit;

        setDraftConfigs(newConfigs); // Update state
        setShowSyncPrompt(false);
        proceedWithSave(newConfigs); // Save the newly synced configs
    };

    /**
     * @function handleCancelSync - Modal Action: Close the modal, do nothing.
     */
    const handleCancelSync = () => {
        setShowSyncPrompt(false);
        setMismatchData(null);
    };

    
    /**
     * @function handleAttemptBack - Handles the "Back" button click.
     * If there are unsaved changes, it shows the confirmation prompt. Otherwise, it navigates back immediately.
     */
    const handleAttemptBack = () => {
        if (hasUnsavedChanges()) {
            setShowUnsavedPrompt(true);
        } else {
            onBack();
        }
    };

    /**
     * @function handleDiscardAndExit - Handles the "Discard & Exit" action from the modal.
     */
    const handleDiscardAndExit = () => {
        setShowUnsavedPrompt(false);
        onBack();
    };

    /**
     * @function handleSaveAndExit - Handles the "Save & Exit" action from the modal.
     */
    const handleSaveAndExit = async () => {
        // 1. Run new validation logic first.
        if (!validateParameterSelection()) {
            return; // Stop save if validation fails.
        }

        // 2. Use the standard flow, but we need to handle the 'Exit' part.
        // Since standard flow is async and involves modals, we simply trigger it.
        // If successful, 'proceedWithSave' will execute. 
        // NOTE: In this simplified version, we rely on the user clicking "Back" again after saving.
        // Or we assume 'onSave' updates parent state which might unmount this component.
        
        // Trigger the validation/save flow
        triggerSaveFlow(draftConfigs);
        
        // Hide the "Unsaved Changes" prompt immediately so other modals can show up if needed
        setShowUnsavedPrompt(false);
    };
    
    /**
     * @function getSaveButtonContent
     * @returns {JSX.Element} - The dynamic content for the save button.
     */
    const getSaveButtonContent = () => {
        if (isSaving) {
            return <><LoaderCircle size={16} className={styles['spinner']} /><span>Saving...</span></>;
        }
        if (saveSuccess) {
            return <><Check size={16} /><span>Saved!</span></>;
        }
        return <><Save size={16} /><span>Save Configurations</span></>;
    };

     /**
     * @function handleShowGuidelines - Opens the guidelines modal.
     * It stops event propagation to prevent the collapsible panel from toggling.
     */
    const handleShowGuidelines = (e, sectionId) => {
        e.stopPropagation(); // This is crucial!
        setGuidelinesSection(sectionId);
        setShowGuidelines(true);
    };

    // --- RENDER LOGIC ---

   if (!draftConfigs) {
        return <div>Loading configurations...</div>;
    }

    const deviceStatus = device.currentState?.status || 'Offline';

    return (
        <>
            {/* Validation Modal Render */}
            {validationError && (
                <ValidationErrorModal 
                    message={validationError} 
                    onClose={() => setValidationError(null)} 
                />
            )}

            <div className={styles['settings-wrapper']}>
                <div className={styles['settings-actions']}>
                    <button onClick={handleAttemptBack} className={styles['back-button']} disabled={isSaving}>
                        <ArrowLeft size={16} />
                        <span>Back to Device Selection</span>
                    </button>
                    <button 
                        onClick={handleSaveClick} // This now triggers the check
                        className={`${styles['save-button']} ${saveSuccess ? styles['save-success'] : ''}`}
                        disabled={isSaving || !hasUnsavedChanges()}
                    >
                        {getSaveButtonContent()}
                    </button>
                </div>

                {deviceStatus === 'Online' || deviceStatus === 'Maintenance' ? (
                    <div className={styles['settings-container']}>
                        {/* --- Alert Thresholds Panel --- */}
                        <CollapsiblePanel
                            title={
                                <div className={styles['header-with-icon']}>
                                    <span>Alert Thresholds</span>
                                    <HelpCircle 
                                        size={16} 
                                        className={styles['guidelines-icon']} 
                                        onClick={(e) => handleShowGuidelines(e, 'guide-thresholds')} 
                                    />
                                </div>
                            }
                            icon={<AlertTriangle size={18} className={`${styles['header-icon']} ${styles['icon-alerts']}`} />}
                            isOpen={openPanels.alerts}
                            onToggle={() => handleTogglePanel('alerts')}
                        >
                            {/* pH Level */}
                            <ThresholdGroup label="pH Level">
                                {draftConfigs?.thresholds?.ph ? (
                                    <>
                                        <div className={styles['input-row-4-col']}>
                                            <InputField label="Warning Low" value={draftConfigs.thresholds.ph.warnLow} onChange={e => handleDeepChange(['thresholds', 'ph', 'warnLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical Low" value={draftConfigs.thresholds.ph.critLow} onChange={e => handleDeepChange(['thresholds', 'ph', 'critLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Warning High" value={draftConfigs.thresholds.ph.warnHigh} onChange={e => handleDeepChange(['thresholds', 'ph', 'warnHigh'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical High" value={draftConfigs.thresholds.ph.critHigh} onChange={e => handleDeepChange(['thresholds', 'ph', 'critHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Back to Normal (Low)" value={draftConfigs.thresholds.ph.normalLow} onChange={e => handleDeepChange(['thresholds', 'ph', 'normalLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Back to Normal (High)" value={draftConfigs.thresholds.ph.normalHigh} onChange={e => handleDeepChange(['thresholds', 'ph', 'normalHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>

                            {/* Turbidity */}
                            <ThresholdGroup label="Turbidity (NTU)">
                                {draftConfigs?.thresholds?.turbidity ? (
                                    <>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Warning Threshold" value={draftConfigs.thresholds.turbidity.warn} onChange={e => handleDeepChange(['thresholds', 'turbidity', 'warn'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical Threshold" value={draftConfigs.thresholds.turbidity.crit} onChange={e => handleDeepChange(['thresholds', 'turbidity', 'crit'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Back to Normal (Low)" value={draftConfigs.thresholds.turbidity.normalLow} onChange={e => handleDeepChange(['thresholds', 'turbidity', 'normalLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Back to Normal (High)" value={draftConfigs.thresholds.turbidity.normalHigh} onChange={e => handleDeepChange(['thresholds', 'turbidity', 'normalHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>

                            {/* TDS */}
                            <ThresholdGroup label="TDS (mg/L)">
                                {draftConfigs?.thresholds?.tds ? (
                                    <>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Warning Threshold" value={draftConfigs.thresholds.tds.warn} onChange={e => handleDeepChange(['thresholds', 'tds', 'warn'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical Threshold" value={draftConfigs.thresholds.tds.crit} onChange={e => handleDeepChange(['thresholds', 'tds', 'crit'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Back to Normal (Low)" value={draftConfigs.thresholds.tds.normalLow} onChange={e => handleDeepChange(['thresholds', 'tds', 'normalLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Back to Normal (High)" value={draftConfigs.thresholds.tds.normalHigh} onChange={e => handleDeepChange(['thresholds', 'tds', 'normalHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>

                            {/* Temperature */}
                            <ThresholdGroup label="Temperature (°C)">
                                {draftConfigs?.thresholds?.temp ? (
                                    <>
                                        <div className={styles['input-row-4-col']}>
                                            <InputField label="Warning Low" value={draftConfigs.thresholds.temp.warnLow} onChange={e => handleDeepChange(['thresholds', 'temp', 'warnLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical Low" value={draftConfigs.thresholds.temp.critLow} onChange={e => handleDeepChange(['thresholds', 'temp', 'critLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Warning High" value={draftConfigs.thresholds.temp.warnHigh} onChange={e => handleDeepChange(['thresholds', 'temp', 'warnHigh'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical High" value={draftConfigs.thresholds.temp.critHigh} onChange={e => handleDeepChange(['thresholds', 'temp', 'critHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Back to Normal (Low)" value={draftConfigs.thresholds.temp.normalLow} onChange={e => handleDeepChange(['thresholds', 'temp', 'normalLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Back to Normal (High)" value={draftConfigs.thresholds.temp.normalHigh} onChange={e => handleDeepChange(['thresholds', 'temp', 'normalHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>
                        </CollapsiblePanel>

                        {/* --- Alert Logging Intervals Panel --- */}
                        <CollapsiblePanel
                            title={
                                <div className={styles['header-with-icon']}>
                                    <span>Alert Logging Intervals</span>
                                    <HelpCircle 
                                        size={16} 
                                        className={styles['guidelines-icon']} 
                                        onClick={(e) => handleShowGuidelines(e, 'guide-logging')} 
                                    />
                                </div>
                            }
                            icon={<History size={18} className={`${styles['header-icon']} ${styles['icon-logging']}`} />}
                            isOpen={openPanels.logging}
                            onToggle={() => handleTogglePanel('logging')}
                        >
                            <ThresholdGroup label="Back-to-normal Alert → Recent Alert">
                                <SelectField value={draftConfigs.logging?.alertIntervals?.activeToRecent} onChange={e => handleDeepChange(['logging', 'alertIntervals', 'activeToRecent'], parseInt(e.target.value))} options={[15, 30, 45, 60]} unit="seconds" />
                            </ThresholdGroup>
                            <ThresholdGroup label="Recent Alert → History">
                                <SelectField value={draftConfigs.logging?.alertIntervals?.recentToHistory} onChange={e => handleDeepChange(['logging', 'alertIntervals', 'recentToHistory'], parseInt(e.target.value))} options={[5, 10, 15, 30, 60]} unit="minutes" />
                            </ThresholdGroup>
                        </CollapsiblePanel>

                        {/* --- Pump Cycle Intervals Panel --- */}
                        <CollapsiblePanel
                            title={
                                <div className={styles['header-with-icon']}>
                                    <span>Pump Cycle Intervals</span>
                                    <HelpCircle 
                                        size={16} 
                                        className={styles['guidelines-icon']} 
                                        onClick={(e) => handleShowGuidelines(e, 'guide-pump')} 
                                    />
                                </div>
                            }
                            icon={<RefreshCw size={18} className={`${styles['header-icon']} ${styles['icon-testing']}`} />}
                            isOpen={openPanels.testing}
                            onToggle={() => handleTogglePanel('testing')}
                        >
                            <ThresholdGroup label="Draining Time">
                                <SelectField value={draftConfigs.controls?.pumpCycleIntervals?.drain} onChange={e => handleDeepChange(['controls', 'pumpCycleIntervals', 'drain'], parseInt(e.target.value))} options={[1, 2, 3, 4, 5]} unit="minutes" />
                            </ThresholdGroup>
                            <ThresholdGroup label="Delay before Filling">
                                <SelectField value={draftConfigs.controls?.pumpCycleIntervals?.delay} onChange={e => handleDeepChange(['controls', 'pumpCycleIntervals', 'delay'], parseInt(e.target.value))} options={[1, 2, 3, 4, 5]} unit="minutes" />
                            </ThresholdGroup>
                            <ThresholdGroup label="Filling Duration">
                                <SelectField value={draftConfigs.controls?.pumpCycleIntervals?.fill} onChange={e => handleDeepChange(['controls', 'pumpCycleIntervals', 'fill'], parseInt(e.target.value))} options={[1, 2, 3, 4, 5]} unit="minutes" />
                            </ThresholdGroup>
                        </CollapsiblePanel>
                        
                        {/* --- Valve Shut-off Panel --- */}
                        <CollapsiblePanel
                            title={
                                <div className={styles['header-with-icon']}>
                                    <span>Valve Rules & Thresholds</span>
                                    <HelpCircle 
                                        size={16} 
                                        className={styles['guidelines-icon']} 
                                        onClick={(e) => handleShowGuidelines(e, 'guide-valve')} 
                                    />
                                </div>
                            }
                            icon={<PowerOff size={18} className={`${styles['header-icon']} ${styles['icon-shutoff']}`} />}
                            isOpen={openPanels.shutoff}
                            onToggle={() => handleTogglePanel('shutoff')}
                        >
                            {draftConfigs?.controls?.valveShutOff ? (
                                <>
                                    {/* ---  SYNC BUTTON --- */}
                                    <div className={styles['sync-button-wrapper']}>
                                        <button onClick={handleSyncAllFromAlerts} className={styles['sync-button']}>
                                            <Link size={14} />
                                            <span>Sync from Alert Thresholds</span>
                                        </button>
                                    </div>

                                    {/* --- THRESHOLD INPUTS --- */}
                                    <ThresholdGroup label="Shut-Off Threshold Definition">
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="pH Critical Low" value={draftConfigs.controls.valveShutOff.phLow} onChange={e => handleDeepChange(['controls', 'valveShutOff', 'phLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="pH Critical High" value={draftConfigs.controls.valveShutOff.phHigh} onChange={e => handleDeepChange(['controls', 'valveShutOff', 'phHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </ThresholdGroup>
                                    <ThresholdGroup label="Shut-Off on Turbidity">
                                        <div className={styles['input-row-1-col']}>
                                            <InputField label="Turbidity Critical" value={draftConfigs.controls.valveShutOff.turbidityCrit} onChange={e => handleDeepChange(['controls', 'valveShutOff', 'turbidityCrit'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </ThresholdGroup>
                                    <ThresholdGroup label="Shut-Off on TDS">
                                        <div className={styles['input-row-1-col']}>
                                            <InputField label="TDS Critical" value={draftConfigs.controls.valveShutOff.tdsCrit} onChange={e => handleDeepChange(['controls', 'valveShutOff', 'tdsCrit'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </ThresholdGroup>
                                    
                                    <div className={styles['global-rule-divider']}></div>
                                    
                                    {/* --- AUTO SHUT-OFF RULES --- */}
                                    <ThresholdGroup label="Automatic Shut-off Rules">
                                        <YesNoSelect
                                            label="Enable Automatic Valve Shut-off?"
                                            value={draftConfigs.controls.valveShutOff?.enabled ? 'yes' : 'no'}
                                            onChange={e => handleDeepChange(['controls', 'valveShutOff', 'enabled'], e.target.value === 'yes')}
                                        />
                                        
                                        {/* Conditionally Render Checkboxes based on the 'enabled' flag */}
                                        {draftConfigs.controls.valveShutOff?.enabled && (
                                            <div className={styles['checkbox-container']}>
                                                <p className={styles['checkbox-label']}>Trigger Shut-off on:</p>
                                                <div className={styles['checkbox-group']}>
                                                    <Checkbox 
                                                        label="pH" 
                                                        checked={draftConfigs.controls.valveShutOff.triggerPH}
                                                        onChange={e => handleDeepChange(['controls', 'valveShutOff', 'triggerPH'], e.target.checked)}
                                                    />
                                                    <Checkbox 
                                                        label="Turbidity" 
                                                        checked={draftConfigs.controls.valveShutOff.triggerTurbidity}
                                                        onChange={e => handleDeepChange(['controls', 'valveShutOff', 'triggerTurbidity'], e.target.checked)}
                                                    />
                                                    <Checkbox 
                                                        label="TDS" 
                                                        checked={draftConfigs.controls.valveShutOff.triggerTDS}
                                                        onChange={e => handleDeepChange(['controls', 'valveShutOff', 'triggerTDS'], e.target.checked)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </ThresholdGroup>

                                    {/* --- AUTO RE-OPEN RULES --- */}
                                    <ThresholdGroup label="Automatic Re-open Rules">
                                        <YesNoSelect
                                            label="Auto Re-open Valve once alert is cleared?"
                                            value={draftConfigs.controls.valveOpenOnNormal?.enabled ? 'yes' : 'no'}
                                            onChange={e => handleDeepChange(['controls', 'valveOpenOnNormal', 'enabled'], e.target.value === 'yes')}
                                        />

                                        {/* Conditionally Render Checkboxes based on the 'enabled' flag */}
                                        {draftConfigs.controls.valveOpenOnNormal?.enabled && (
                                            <div className={styles['checkbox-container']}>
                                                <p className={styles['checkbox-label']}>Trigger Re-open on (Monitors):</p>
                                                <div className={styles['checkbox-group']}>
                                                    <Checkbox 
                                                        label="pH" 
                                                        checked={draftConfigs.controls.valveOpenOnNormal.triggerPH}
                                                        onChange={e => handleDeepChange(['controls', 'valveOpenOnNormal', 'triggerPH'], e.target.checked)}
                                                    />
                                                    <Checkbox 
                                                        label="Turbidity" 
                                                        checked={draftConfigs.controls.valveOpenOnNormal.triggerTurbidity}
                                                        onChange={e => handleDeepChange(['controls', 'valveOpenOnNormal', 'triggerTurbidity'], e.target.checked)}
                                                    />
                                                    <Checkbox 
                                                        label="TDS" 
                                                        checked={draftConfigs.controls.valveOpenOnNormal.triggerTDS}
                                                        onChange={e => handleDeepChange(['controls', 'valveOpenOnNormal', 'triggerTDS'], e.target.checked)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </ThresholdGroup>
                                </>
                            ) : <NotConfiguredMessage />}
                        </CollapsiblePanel>
                    </div>
                ) : (
                    <div className={styles['offline-device']}>
                        <div className={styles['offline-card']}>
                            <div className={styles['icon-wrapper']}><WifiOff size={50}/></div>
                            <h4>{device.label} is currently offline</h4>
                            <p>You cannot configure this device's <br /> settings while its offline.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* --- UNSAVED CHANGES MODAL --- */}
            {showUnsavedPrompt && (
                <div className={`${styles.modalBackdrop} ${styles.confirmationModalBackdrop}`}>
                    <div className={`${styles.modalContent} ${styles.confirmationModalContent}`}>
                        <div className={styles.icon}><AlertTriangle size={48} /></div>
                        <h4>Unsaved Changes</h4>
                        <p>You have unsaved changes. How would you like to proceed?</p>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowUnsavedPrompt(false)} className={styles.buttonTertiary} disabled={isSaving}>Stay on Page</button>
                            <button onClick={handleDiscardAndExit} className={styles.buttonSecondary} disabled={isSaving}>Discard & Exit</button>
                            <button onClick={handleSaveAndExit} className={styles.buttonPrimary} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save & Exit'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- THRESHOLD IMBALANCE MODAL --- */}
            {showImbalancePrompt && imbalanceDetails && (
                <div className={`${styles.modalBackdrop} ${styles.confirmationModalBackdrop}`}>
                    <div className={`${styles.confirmationModalContent} ${styles.syncModalContent}`}>
                        <div className={styles.icon}><AlertTriangle size={48} /></div>
                        <h4>Configuration Imbalance Detected</h4>
                        <p>The thresholds you entered violate the logical order required for the system to generate alerts correctly (e.g., Critical Low must be less than Warning Low).</p>

                        <div className={styles['imbalance-container']}>
                            {imbalanceDetails.issues.map((issue, idx) => (
                                <div key={idx} className={styles['imbalance-item']}>
                                    <div className={styles['imbalance-title']}>
                                        <AlertTriangle size={14} color="#f59e0b" /> 
                                        Issue in {issue.param}
                                    </div>
                                    {issue.list.map((text, i) => (
                                        <p key={i} className={styles['issue-text']}>{text}</p>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '15px'}}>
                            We can automatically optimize your settings by adjusting values to restore the logical order.
                        </p>

                        <div className={styles.syncModalFooter}>
                            <button onClick={handleOptimizeAndSave} className={styles.buttonPrimary} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Optimize & Save (Recommended)'}
                            </button>
                            <button onClick={handleIgnoreImbalance} className={styles.buttonSecondary} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Ignore & Save (Risk of System Errors)'}
                            </button>
                            <button onClick={handleDiscardImbalance} className={styles.buttonTertiary} disabled={isSaving}>
                                Cancel & Edit Manually
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- THRESHOLD SYNC MODAL --- */}
            {showSyncPrompt && mismatchData && (
                <div className={`${styles.modalBackdrop} ${styles.confirmationModalBackdrop}`}>
                    <div className={`${styles.confirmationModalContent} ${styles.syncModalContent}`}>
                        <div className={styles.icon}><AlertTriangle size={48} /></div>
                        <h4>Threshold Mismatch</h4>
                        <p>Your 'Critical Alert' and 'Valve Shut-off' thresholds do not match. For best accuracy, they should be synchronized.</p>
                        
                        <div className={styles['mismatch-details']}>
                            <p>Current Mismatched Values:</p>
                            <table className={styles['mismatch-table']}>
                                <thead>
                                    <tr>
                                        <th>Parameter</th>
                                        <th>Alert Value</th>
                                        <th>Shut-off Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(mismatchData).map(([key, data]) => (
                                        <tr key={key}>
                                            <td>{key.replace('phLow', 'pH Low').replace('phHigh', 'pH High').replace('turbidity', 'Turbidity').replace('tds', 'TDS')}</td>
                                            <td>
                                                <span className={`${styles['mismatch-value']} ${data.isMismatched ? styles.mismatched : styles.matched}`}>
                                                    {data.alert}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles['mismatch-value']} ${data.isMismatched ? styles.mismatched : styles.matched}`}>
                                                    {data.shutoff}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.syncModalFooter}>
                            <button onClick={handleSyncAlertsToShutoff} className={styles.buttonPrimary} disabled={isSaving}>
                                {isSaving ? 'Syncing...' : 'Sync: Use Critical Alert Values for Both'}
                            </button>
                            <button onClick={handleSyncShutoffToAlerts} className={styles.buttonPrimary} disabled={isSaving}>
                                {isSaving ? 'Syncing...' : 'Sync: Use Valve Shut-off Values for Both'}
                            </button>
                            <button onClick={handleSaveWithoutSyncing} className={styles.buttonSecondary} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Mismatched Values (Ignore)'}
                            </button>
                            <button onClick={handleCancelSync} className={styles.buttonTertiary} disabled={isSaving}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* --- GUIDELINES MODAL --- */}
            {showGuidelines && (
                <GuidelinesModal 
                    onClose={() => setShowGuidelines(false)} 
                    initialSection={guidelinesSection} // Pass the section ID here
                />
            )}
        </>
    );
};

// --- HELPER COMPONENTS ---

/**
 * A reusable collapsible panel component for the accordion layout.
 * The title prop now directly renders JSX for more flexibility.
 */
const CollapsiblePanel = ({ icon, title, isOpen, onToggle, children }) => {
    return (
        <div className={styles['collapsible-panel']}>
            <div className={styles['collapsible-header']} onClick={onToggle}>
                <div className={styles['header-title-group']}>
                    {icon}
                    {/* This change allows us to pass in the title with the icon */}
                    {title}
                </div>
                <ChevronDown size={20} className={`${styles['chevron-icon']} ${isOpen ? styles['open'] : ''}`} />
            </div>
            <div className={`${styles['collapsible-content']} ${isOpen ? styles['open'] : ''}`}>
                <div className={styles['content-inner']}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const ThresholdGroup = ({ label, children }) => (
    <div className={styles['threshold-group']}>
        <label>{label}</label>
        <div className={styles['input-rows-container']}>{children}</div>
    </div>
);

const InputField = ({ label, value, onChange }) => (
    <div className={styles['input-field']}>
        <label>{label}</label>
        <input type="number" value={value} onChange={onChange} />
    </div>
);

const SelectField = ({ value, onChange, options, unit = "minutes" }) => (
    <select value={value} onChange={onChange} className={styles['select-field']}>
        {options && options.map(o => <option key={o} value={o}>Every {o} {unit}</option>)}
    </select>
);

/**
 * A reusable select component for Yes/No options.
 * @param {string} label - The label for the select field.
 * @param {string} value - The current value ('yes' or 'no').
 * @param {function} onChange - The function to call when the value changes.
 */
const YesNoSelect = ({ label, value, onChange }) => (
    <div className={styles['input-field']}>
        <label>{label}</label>
        <select value={value} onChange={onChange} className={styles['select-field']}>
            <option value="no">Disabled</option>
            <option value="yes">Enabled</option>
        </select>
    </div>
);

/**
 * A reusable checkbox component for the parameter triggers.
 * @param {string} label - The label for the checkbox.
 * @param {boolean} checked - The current checked state.
 * @param {function} onChange - The function to call when the value changes.
 */
const Checkbox = ({ label, checked, onChange }) => (
    <label className={styles['custom-checkbox']}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        {/* Using a span for better styling control of the label text */}
        <span>{label}</span>
    </label>
);

export default ConfigurationSettings;