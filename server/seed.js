// server/seed.js
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Reading = require('./models/Reading');

// =================================================================
// --- Configuration ---
// =================================================================

const NUM_DAYS = 30;
const READINGS_PER_HOUR = 2;

const DEVICES = [
  {
    deviceId: "ps01-dev",
    base: { PH: 7.2, TDS: 345, TEMP: 28.0, TURBIDITY: 4.0 },
    flux: { PH: 0.15, TDS: 15, TEMP: 0.5, TURBIDITY: 0.8 }, // Reduced random flux slightly
  },
  {
    deviceId: "ps02-dev",
    base: { PH: 7.4, TDS: 350, TEMP: 28.5, TURBIDITY: 4.2 },
    flux: { PH: 0.2, TDS: 20, TEMP: 0.4, TURBIDITY: 0.6 },
  },
  {
    deviceId: "ps03-dev",
    base: { PH: 7.0, TDS: 330, TEMP: 27.5, TURBIDITY: 3.8 },
    flux: { PH: 0.25, TDS: 25, TEMP: 0.6, TURBIDITY: 1.0 },
  },
];

// =================================================================
// --- Data Generation Function ---
// =================================================================

const generateReadingsForDevice = (deviceId, endDate, baseValues, fluctuations) => {
  const readings = [];
  
  for (let day = 0; day < NUM_DAYS; day++) {
    for (let hour = 0; hour < 24; hour++) {
      for (let i = 0; i < READINGS_PER_HOUR; i++) {
        
        const currentTimestamp = new Date(endDate);
        currentTimestamp.setDate(endDate.getDate() - day);
        currentTimestamp.setHours(hour, i * (60 / READINGS_PER_HOUR), 0, 0);

        // --- ✨ NEW: Simulate a realistic daily cycle ---
        // Create a value from -1 to 1 based on the hour of the day.
        // We shift it so the peak is in the afternoon (around hour 15-16).
        const cycle = Math.sin(((hour - 6) / 24) * 2 * Math.PI);

        // Temperature is warmer in the afternoon (cycle > 0) and cooler at night (cycle < 0)
        const tempCycleEffect = cycle * 1.5; // e.g., +/- 1.5 degrees

        // Let's say pH is slightly lower when temperature is higher (inverse relationship)
        const phCycleEffect = cycle * -0.1; // e.g., +/- 0.1 pH

        // --- Generate values with random flux AND the daily cycle ---
        const reading = {
          TEMP: parseFloat((baseValues.TEMP + tempCycleEffect + (Math.random() - 0.5) * fluctuations.TEMP).toFixed(1)),
          PH: parseFloat((baseValues.PH + phCycleEffect + (Math.random() - 0.5) * fluctuations.PH).toFixed(2)),
          TDS: parseFloat((baseValues.TDS + (Math.random() - 0.5) * fluctuations.TDS).toFixed(1)),
          TURBIDITY: parseFloat((baseValues.TURBIDITY + (Math.random() - 0.5) * fluctuations.TURBIDITY).toFixed(1)),
        };

        readings.push({
          deviceId,
          timestamp: currentTimestamp,
          reading,
        });
      }
    }
  }
  return readings;
};

// =================================================================
// --- Main Seeding Function (Unchanged) ---
// =================================================================

const seedDB = async () => {
  await connectDB();
  try {
    console.log('Clearing old readings from the database...');
    await Reading.deleteMany({});
    console.log('Old readings cleared.');

    console.log('Generating new sample readings for the past week...');
    let allReadings = [];
    const now = new Date();

    for (const device of DEVICES) {
      const deviceReadings = generateReadingsForDevice(device.deviceId, now, device.base, device.flux);
      allReadings = allReadings.concat(deviceReadings);
    }
    
    console.log(`Generated ${allReadings.length} total readings. Inserting into database...`);
    await Reading.insertMany(allReadings);
    console.log('Database seeded successfully!');

  } catch (error) {
    console.error('Error seeding the database:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from database.');
  }
};

seedDB();