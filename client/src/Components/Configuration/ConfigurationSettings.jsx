import React, { useState, useEffect } from 'react';
import styles from '../../Styles/ConfigurationSettings.module.css';
import { WifiOff, ArrowLeft, Save, AlertTriangle, LoaderCircle, Check, ChevronDown, History, RefreshCw, PowerOff } from 'lucide-react';

/**
 * A reusable component to display a message when a setting is not configured.
 */
const NotConfiguredMessage = () => (
    <div className={styles['not-configured-message']}>
        <AlertTriangle size={18} />
        <p>This setting has not been configured for this device.</p>
    </div>
);

const ConfigurationSettings = ({ device, onSave, onBack }) => {
    // --- STATE MANAGEMENT ---

    /**
     * @state {object | null} originalConfigs - Stores a deep copy of the device's original configurations.
     * This acts as a "baseline" to compare against for detecting unsaved changes.
     */
    const [originalConfigs, setOriginalConfigs] = useState(null);

    /**
     * @state {object | null} draftConfigs - Stores the configurations as the user modifies them.
     * All user input updates this state, leaving `originalConfigs` untouched until a save occurs.
     */
    const [draftConfigs, setDraftConfigs] = useState(null);

    /**
     * @state {boolean} showUnsavedPrompt - Controls the visibility of the "Unsaved Changes" confirmation modal.
     */
    const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

    /**
     * @state {boolean} isSaving - A flag to indicate when a save operation is in progress.
     * Used to disable buttons and show loading indicators.
     */
    const [isSaving, setIsSaving] = useState(false);

    /**
     * @state {boolean} saveSuccess - A flag to temporarily show a "Saved!" success message on the save button.
     */
    const [saveSuccess, setSaveSuccess] = useState(false);

    /**
     * @state {object} openPanels - NEW: Manages the open/closed state of the collapsible panels.
     */
    const [openPanels, setOpenPanels] = useState({
        alerts: true, // Start with the main panel open
        logging: false,
        testing: false,
        shutoff: false,
    });

    // --- LIFECYCLE HOOKS ---

    /**
     * @effect Initializes component state when a new `device` is selected.
     * It creates deep copies of the device's configurations for both the 'original' and 'draft' states.
     * It also gracefully handles cases where a device has no pre-existing configuration data by defaulting to an empty object.
     */
    useEffect(() => {
        const initialConfigs = device.configurations
            ? JSON.parse(JSON.stringify(device.configurations))
            : {};
        
        setOriginalConfigs(initialConfigs);
        setDraftConfigs(initialConfigs);
        setSaveSuccess(false); // Reset save success state when device changes
    }, [device]);

    // --- UTILITY & EVENT HANDLERS ---
    
    /**
     * @function handleTogglePanel - NEW: Toggles the open/closed state of a specific panel.
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
     * @function handleChange - Generic handler for number input fields.
     * Updates the correct nested property within the `draftConfigs` state.
     * @param {string} category - The top-level key in the config object (e.g., 'ph').
     * @param {string} field - The nested key to update (e.g., 'warnLow').
     * @param {string} value - The new value from the input field.
     */
    const handleChange = (category, field, value) => {
        setDraftConfigs(prev => ({
            ...prev,
            [category]: { ...prev[category], [field]: parseFloat(value) || 0 }
        }));
    };
    
    /**
     * @function handleIntervalChange - Generic handler for select/dropdown fields.
     * Updates the correct nested property within the `draftConfigs` state.
     * @param {string} category - The top-level key in the config object (e.g., 'alertLoggingIntervals').
     * @param {string} field - The nested key to update (e.g., 'activeToRecent').
     * @param {string} value - The new value from the select field.
     */
    const handleIntervalChange = (category, field, value) => {
        setDraftConfigs(prev => ({
            ...prev,
            [category]: { ...prev[category], [field]: parseInt(value) }
        }));
    };

    /**
     * @function handleSaveClick - Handles the main "Save Configurations" button click.
     * It calls the `onSave` prop passed from the parent and, upon success,
     * updates the `originalConfigs` baseline to match the newly saved `draftConfigs`.
     */
    const handleSaveClick = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await onSave(device.id, draftConfigs);
            setOriginalConfigs(JSON.parse(JSON.stringify(draftConfigs)));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error("Failed to save configurations:", error);
            alert("Error: Could not save settings.");
        } finally {
            setIsSaving(false);
        }
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
        setIsSaving(true);
        try {
            await onSave(device.id, draftConfigs);
            onBack();
        } catch (error) {
            console.error("Failed to save configurations:", error);
            alert("Error: Could not save settings.");
            setIsSaving(false);
        }
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

    // --- RENDER LOGIC ---

    if (!draftConfigs) {
        return <div>Loading configurations...</div>;
    }
    
    return (
        <>
            <div className={styles['settings-wrapper']}>
                <div className={styles['settings-actions']}>
                    <button onClick={handleAttemptBack} className={styles['back-button']} disabled={isSaving}>
                        <ArrowLeft size={16} />
                        <span>Back to Device Selection</span>
                    </button>
                    <button 
                        onClick={handleSaveClick} 
                        className={`${styles['save-button']} ${saveSuccess ? styles['save-success'] : ''}`}
                        disabled={isSaving || !hasUnsavedChanges()}
                    >
                        {getSaveButtonContent()}
                    </button>
                </div>

                {device.status === 'Online' ? (
                    // NEW: Main container for the single-column accordion layout
                    <div className={styles['settings-container']}>
                        <CollapsiblePanel
                            title="Alert Thresholds"
                            icon={<AlertTriangle size={18} className={`${styles['header-icon']} ${styles['icon-alerts']}`} />}
                            isOpen={openPanels.alerts}
                            onToggle={() => handleTogglePanel('alerts')}
                        >
                            <ThresholdGroup label="pH Level">
                                {draftConfigs?.ph ? (
                                    <>
                                        <div className={styles['input-row-4-col']}><InputField label="Warning Low" value={draftConfigs.ph.warnLow} onChange={e => handleChange('ph', 'warnLow', e.target.value)} /><InputField label="Critical Low" value={draftConfigs.ph.critLow} onChange={e => handleChange('ph', 'critLow', e.target.value)} /><InputField label="Warning High" value={draftConfigs.ph.warnHigh} onChange={e => handleChange('ph', 'warnHigh', e.target.value)} /><InputField label="Critical High" value={draftConfigs.ph.critHigh} onChange={e => handleChange('ph', 'critHigh', e.target.value)} /></div>
                                        <div className={styles['input-row-2-col']}><InputField label="Back to Normal (Low)" value={draftConfigs.ph.normalLow} onChange={e => handleChange('ph', 'normalLow', e.target.value)} /><InputField label="Back to Normal (High)" value={draftConfigs.ph.normalHigh} onChange={e => handleChange('ph', 'normalHigh', e.target.value)} /></div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>
                            <ThresholdGroup label="Turbidity (NTU)">
                                {draftConfigs?.turbidity ? (
                                    <>
                                        <div className={styles['input-row-2-col']}><InputField label="Warning Threshold" value={draftConfigs.turbidity.warn} onChange={e => handleChange('turbidity', 'warn', e.target.value)} /><InputField label="Critical Threshold" value={draftConfigs.turbidity.crit} onChange={e => handleChange('turbidity', 'crit', e.target.value)} /></div>
                                        <div className={styles['input-row-2-col']}><InputField label="Back to Normal (Low)" value={draftConfigs.turbidity.normalLow} onChange={e => handleChange('turbidity', 'normalLow', e.target.value)} /><InputField label="Back to Normal (High)" value={draftConfigs.turbidity.normalHigh} onChange={e => handleChange('turbidity', 'normalHigh', e.target.value)} /></div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>
                            <ThresholdGroup label="TDS (mg/L)">
                                {draftConfigs?.tds ? (
                                    <>
                                        <div className={styles['input-row-2-col']}><InputField label="Warning Threshold" value={draftConfigs.tds.warn} onChange={e => handleChange('tds', 'warn', e.target.value)} /><InputField label="Critical Threshold" value={draftConfigs.tds.crit} onChange={e => handleChange('tds', 'crit', e.target.value)} /></div>
                                        <div className={styles['input-row-2-col']}><InputField label="Back to Normal (Low)" value={draftConfigs.tds.normalLow} onChange={e => handleChange('tds', 'normalLow', e.target.value)} /><InputField label="Back to Normal (High)" value={draftConfigs.tds.normalHigh} onChange={e => handleChange('tds', 'normalHigh', e.target.value)} /></div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>
                            <ThresholdGroup label="Temperature (°C)">
                                {draftConfigs?.temp ? (
                                    <>
                                        <div className={styles['input-row-4-col']}><InputField label="Warning Low" value={draftConfigs.temp.warnLow} onChange={e => handleChange('temp', 'warnLow', e.target.value)} /><InputField label="Critical Low" value={draftConfigs.temp.critLow} onChange={e => handleChange('temp', 'critLow', e.target.value)} /><InputField label="Warning High" value={draftConfigs.temp.warnHigh} onChange={e => handleChange('temp', 'warnHigh', e.target.value)} /><InputField label="Critical High" value={draftConfigs.temp.critHigh} onChange={e => handleChange('temp', 'critHigh', e.target.value)} /></div>
                                        <div className={styles['input-row-2-col']}><InputField label="Back to Normal (Low)" value={draftConfigs.temp.normalLow} onChange={e => handleChange('temp', 'normalLow', e.target.value)} /><InputField label="Back to Normal (High)" value={draftConfigs.temp.normalHigh} onChange={e => handleChange('temp', 'normalHigh', e.target.value)} /></div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>
                        </CollapsiblePanel>

                        <CollapsiblePanel
                            title="Alert Logging Intervals"
                            icon={<History size={18} className={`${styles['header-icon']} ${styles['icon-logging']}`} />}
                            isOpen={openPanels.logging}
                            onToggle={() => handleTogglePanel('logging')}
                        >
                            <ThresholdGroup label="Active Alert → Recent Alert"><SelectField value={draftConfigs.alertLoggingIntervals?.activeToRecent} onChange={e => handleIntervalChange('alertLoggingIntervals', 'activeToRecent', e.target.value)} options={[15, 30, 45, 60]} unit="seconds" /></ThresholdGroup>
                            <ThresholdGroup label="Recent Alert → History"><SelectField value={draftConfigs.alertLoggingIntervals?.recentToHistory} onChange={e => handleIntervalChange('alertLoggingIntervals', 'recentToHistory', e.target.value)} options={[5, 10, 15, 30, 60]} unit="minutes" /></ThresholdGroup>
                        </CollapsiblePanel>

                        <CollapsiblePanel
                            title="Testing Container Water Change Intervals"
                            icon={<RefreshCw size={18} className={`${styles['header-icon']} ${styles['icon-testing']}`} />}
                            isOpen={openPanels.testing}
                            onToggle={() => handleTogglePanel('testing')}
                        >
                            <ThresholdGroup label="Draining Time"><SelectField value={draftConfigs.testingIntervals?.drain} onChange={e => handleIntervalChange('testingIntervals', 'drain', e.target.value)} options={[1, 2, 3, 4, 5]} unit="minutes" /></ThresholdGroup>
                            <ThresholdGroup label="Delay before Filling"><SelectField value={draftConfigs.testingIntervals?.delay} onChange={e => handleIntervalChange('testingIntervals', 'delay', e.target.value)} options={[1, 2, 3, 4, 5]} unit="minutes" /></ThresholdGroup>
                            <ThresholdGroup label="Filling Duration"><SelectField value={draftConfigs.testingIntervals?.fill} onChange={e => handleIntervalChange('testingIntervals', 'fill', e.target.value)} options={[1, 2, 3, 4, 5]} unit="minutes" /></ThresholdGroup>
                        </CollapsiblePanel>

                        <CollapsiblePanel
                            title="Valve Shut-off Thresholds"
                            icon={<PowerOff size={18} className={`${styles['header-icon']} ${styles['icon-shutoff']}`} />}
                            isOpen={openPanels.shutoff}
                            onToggle={() => handleTogglePanel('shutoff')}
                        >
                            <ThresholdGroup label="Shut-Off on pH">{draftConfigs?.valveShutOff ? <div className={styles['input-row-2-col']}><InputField label="Critical Low" value={draftConfigs.valveShutOff.phLow} onChange={e => handleChange('valveShutOff', 'phLow', e.target.value)} /><InputField label="Critical High" value={draftConfigs.valveShutOff.phHigh} onChange={e => handleChange('valveShutOff', 'phHigh', e.target.value)} /></div> : <NotConfiguredMessage />}</ThresholdGroup>
                            <ThresholdGroup label="Shut-Off on Turbidity">{draftConfigs?.valveShutOff ? <div className={styles['input-row-1-col']}><InputField label="Critical Threshold" value={draftConfigs.valveShutOff.turbidityCrit} onChange={e => handleChange('valveShutOff', 'turbidityCrit', e.target.value)} /></div> : <NotConfiguredMessage />}</ThresholdGroup>
                            <ThresholdGroup label="Shut-Off on TDS">{draftConfigs?.valveShutOff ? <div className={styles['input-row-1-col']}><InputField label="Critical Threshold" value={draftConfigs.valveShutOff.tdsCrit} onChange={e => handleChange('valveShutOff', 'tdsCrit', e.target.value)} /></div> : <NotConfiguredMessage />}</ThresholdGroup>
                        </CollapsiblePanel>
                    </div>
                ) : (
                    <div className={styles['offline-device']}>
                        <div className={styles['offline-card']}>
                            <div className={styles['icon-wrapper']}>
                                <WifiOff size={50}/>
                            </div>
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
        </>
    );
};

// --- HELPER COMPONENTS ---

/**
 * NEW: A reusable collapsible panel component for the accordion layout.
 * @param {React.ReactNode} icon - The icon to display before the title.
 * @param {string} title - The title displayed in the header.
 * @param {boolean} isOpen - Whether the panel is currently open.
 * @param {function} onToggle - The function to call when the header is clicked.
 * @param {React.ReactNode} children - The content to display inside the panel.
 */
const CollapsiblePanel = ({ icon, title, isOpen, onToggle, children }) => {
    return (
        <div className={styles['collapsible-panel']}>
            <div className={styles['collapsible-header']} onClick={onToggle}>
                <div className={styles['header-title-group']}>
                    {icon}
                    <h4>{title}</h4>
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

export default ConfigurationSettings;