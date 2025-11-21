function compareConfigs(oldObj, newObj, path = "", changes = []) {
  // Iterate over every key in the new configuration object
  for (const key in newObj) {
    // Construct the current path (e.g., "controls.valveShutOff.phHigh")
    const newPath = path ? `${path}.${key}` : key;
    
    // specific retrieval of values for comparison
    const oldValue = oldObj ? oldObj[key] : undefined;
    const newValue = newObj[key];

    // --- Recursive Step ---
    // If the value is a nested object (and not null or an array), dive deeper.
    // This allows the function to find changes at any depth of the configuration tree.
    if (typeof newValue === "object" && newValue !== null && !Array.isArray(newValue)) {
      compareConfigs(oldValue || {}, newValue, newPath, changes);
    } else {
      // --- Comparison Step ---
      // Compare primitive values (numbers, strings, booleans) or arrays.
      // JSON.stringify is used to correctly compare arrays by value rather than reference.
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        
        // --- Formatting for Readability ---
        // If the path is very long (e.g., "configurations.controls.pumpCycle.fill"), 
        // shorten it to just the last two segments (e.g., "pumpCycle.fill") 
        // to make the log message cleaner for the end user.
        const parts = newPath.split(".");
        const shortPath = parts.length > 2 ? parts.slice(-2).join(".") : newPath;

        // Record the change in a readable format
        changes.push(`${shortPath}: ${oldValue} → ${newValue}`);
      }
    }
  }
  return changes;
}

module.exports = { compareConfigs };