function compareConfigs(oldObj, newObj, path = "", changes = []) {
  for (const key in newObj) {
    const oldValue = oldObj ? oldObj[key] : undefined;
    const newValue = newObj[key];

    if (typeof newValue === "object" && newValue !== null && !Array.isArray(newValue)) {
      // Recurse into nested objects
      compareConfigs(oldValue || {}, newValue, key, changes);
    } else {
      // Compare primitive values
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push(`${key}: ${oldValue} → ${newValue}`);
      }
    }
  }
  return changes;
}

module.exports = { compareConfigs };