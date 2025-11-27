import React from 'react';
import { X, Info, Activity, ShieldAlert, CheckCircle2, AlertTriangle, MousePointerClick } from 'lucide-react';
import styles from '../../Styles/AlertsInfoModalStyle/AlertsInfoModal.module.css';

const AlertsInfoModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleWrapper}>
                        <Info size={24} className={styles.iconMain} />
                        <h3>Alert Legend & Guide</h3>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    
                    {/* SEVERITY SECTION */}
                    <section className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            <ShieldAlert size={18} /> Severity Levels
                        </h4>
                        <div className={styles.grid}>
                            <div className={styles.item}>
                                <span className={`${styles.badge} ${styles.normal}`}>Normal</span>
                                <p>Readings are within the configured safe range.</p>
                            </div>
                            <div className={styles.item}>
                                <span className={`${styles.badge} ${styles.warning}`}>Warning</span>
                                <p>Readings have entered the warning range threshold.</p>
                            </div>
                            <div className={styles.item}>
                                <span className={`${styles.badge} ${styles.critical}`}>Critical</span>
                                <p>Readings have reached critical levels requiring immediate attention.</p>
                            </div>
                        </div>
                    </section>

                    <div className={styles.divider}></div>

                    {/* STATUS SECTION */}
                    <section className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            <Activity size={18} /> Status Definitions
                        </h4>
                        <ul className={styles.list}>
                            <li>
                                <strong>Active:</strong> The sensor is currently reading this value and the alert condition persists.
                            </li>
                            <li>
                                <strong>Escalated:</strong> The alert has shifted severity levels (e.g., Normal → Warning → Critical) or vice-versa.
                            </li>
                            <li>
                                <strong>Resolved:</strong> A warning alert that returned to normal readings and was subsequently archived.
                            </li>
                            <li>
                                <strong>Cleared:</strong> A "Back to Normal" alert that has been archived.
                            </li>
                        </ul>
                    </section>

                    <div className={styles.divider}></div>

                    {/* ACTION SECTION */}
                    <section className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            <MousePointerClick size={18} /> Actions
                        </h4>
                        <div className={styles.actionGrid}>
                            <div className={styles.actionItem}>
                                <div className={styles.actionHeader}>
                                    <CheckCircle2 size={16} color="#10b981" />
                                    <strong>Acknowledged</strong>
                                </div>
                                <p>User actively clicked the acknowledge button while the alert was active.</p>
                            </div>
                            <div className={styles.actionItem}>
                                <div className={styles.actionHeader}>
                                    <AlertTriangle size={16} color="#f59e0b" />
                                    <strong>Unacknowledged</strong>
                                </div>
                                <p>No action was taken by the user when the alert first appeared in the active state.</p>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default AlertsInfoModal;