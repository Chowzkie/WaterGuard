function compareConfigs(oldObj, newObj, path = "", changes = []) {
  for (const key in newObj) {
    const newPath = path ? `${path}.${key}` : key;
    const oldValue = oldObj ? oldObj[key] : undefined;
    const newValue = newObj[key];

    if (typeof newValue === "object" && newValue !== null && !Array.isArray(newValue)) {
      compareConfigs(oldValue || {}, newValue, newPath, changes);
    } else {
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        // If path has multiple segments, shorten it to the last two
        const parts = newPath.split(".");
        const shortPath = parts.length > 2 ? parts.slice(-2).join(".") : newPath;

        changes.push(`${shortPath}: ${oldValue} → ${newValue}`);
      }
    }
  }
  return changes;
}

module.exports = { compareConfigs };
