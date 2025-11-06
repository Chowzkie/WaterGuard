import styles from '../../Styles/Tabs.module.css';

const Tabs = ({ tabs, activeTab, onTabClick }) => {
  return (
    <div className={styles.tabs}>
      {tabs.map((tabLabel) => (
        <div
          key={tabLabel}
          onClick={() => onTabClick(tabLabel)}
          className={`${styles.tab} ${activeTab === tabLabel ? styles.active : ''}`}
        >
          {tabLabel}
        </div>
      ))}
    </div>
  );
};

export default Tabs;