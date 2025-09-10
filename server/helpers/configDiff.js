function compareConfigs(oldObj, newObj, path = "", changes = []) {
  for (const key in newObj) {
    const newPath = path ? `${path}.${key}` : key;
    const oldValue = oldObj ? oldObj[key] : undefined;
    const newValue = newObj[key];

    if (typeof newValue === "object" && newValue !== null && !Array.isArray(newValue)) {
      // Recurse into nested objects
      compareConfigs(oldValue || {}, newValue, newPath, changes);
    } else {
      // Compare primitive values
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push(`${newPath}: ${oldValue} → ${newValue}`);
      }
    }
  }
  return changes;
}

module.exports = { compareConfigs };