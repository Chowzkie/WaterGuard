// controllers/historicalReadingController.js

const Reading = require('../models/HistoricalReading');

/**
 * @desc    Get historical readings for a specific device
 * @route   GET /api/readings/:deviceId?range=24h|7d|30d
 * @access  Private
 * Function to fetch and aggregate sensor data for charting.
 * Uses MongoDB Aggregation to downsample raw data into averages (Hourly or Daily)
 * based on the requested time range to optimize frontend performance.
 */
exports.getReadingsByDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        // Default to '7d' if no specific range is requested
        const { range = '7d' } = req.query; 

        // --- Date Range Calculation ---
        // Determine the start and end timestamps for the database query.
        // Also determines the grouping granularity (Hourly vs Daily).
        const endDate = new Date();
        let startDate = new Date();
        let groupByFormat;

        switch (range) {
            case '24h':
                startDate.setDate(endDate.getDate() - 1);
                // Format: "%Y-%m-%d-%H" -> Groups data by specific hour of the day
                groupByFormat = "%Y-%m-%d-%H";
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                // Format: "%Y-%m-%d" -> Groups data by specific day
                groupByFormat = "%Y-%m-%d";
                break;
            case '7d':
            default:
                startDate.setDate(endDate.getDate() - 7);
                // Format: "%Y-%m-%d" -> Groups data by specific day
                groupByFormat = "%Y-%m-%d";
                break;
        }

        // --- Aggregation Pipeline Construction ---
        // Define the sequence of operations to perform on the dataset.
        const pipeline = [
            // Stage 1: Match / Filter
            // Filters the collection to include only documents for this device 
            // within the calculated time window. 
            // This is placed first to reduce the dataset size immediately for performance.
            {
                $match: {
                    deviceId: deviceId,
                    timestamp: { $gte: startDate, $lte: endDate }
                }
            },
            
            // Stage 2: Grouping
            // Groups the filtered documents by the time interval (Hour or Day).
            // Calculates statistical metrics (Average, Min, Max) for each sensor
            // to provide a summary of the data for that time slot.
            {
                $group: {
                    // Create a unique ID for the group based on the time format
                    _id: { $dateToString: { format: groupByFormat, date: "$timestamp" } },
                    
                    // --- PH Statistics ---
                    avg_ph: { $avg: '$reading.PH' },
                    min_ph: { $min: '$reading.PH' },
                    max_ph: { $max: '$reading.PH' },
                    
                    // --- TDS Statistics ---
                    avg_tds: { $avg: '$reading.TDS' },
                    min_tds: { $min: '$reading.TDS' },
                    max_tds: { $max: '$reading.TDS' },
                    
                    // --- Temperature Statistics ---
                    avg_temp: { $avg: '$reading.TEMP' },
                    min_temp: { $min: '$reading.TEMP' },
                    max_temp: { $max: '$reading.TEMP' },
                    
                    // --- Turbidity Statistics ---
                    avg_turbidity: { $avg: '$reading.TURBIDITY' },
                    min_turbidity: { $min: '$reading.TURBIDITY' },
                    max_turbidity: { $max: '$reading.TURBIDITY' },
                    
                    // Capture the timestamp of the first record in this group to serve as a reference point
                    timestamp: { $first: '$timestamp' }
                }
            },
            
            // Stage 3: Sort
            // Order the grouped results chronologically (oldest to newest)
            // This ensures the chart on the frontend renders left-to-right correctly.
            {
                $sort: {
                    _id: 1
                }
            },
            
            // Stage 4: Projection / Formatting
            // Reshapes the final output document. 
            // Removes internal MongoDB IDs and structures the sensor data into nested objects.
            {
                $project: {
                    _id: 0, // Exclude the internal grouping ID
                    timestamp: "$timestamp",
                    PH: { avg: "$avg_ph", min: "$min_ph", max: "$max_ph" },
                    TDS: { avg: "$avg_tds", min: "$min_tds", max: "$max_tds" },
                    TEMP: { avg: "$avg_temp", min: "$min_temp", max: "$max_temp" },
                    TURBIDITY: { avg: "$avg_turbidity", min: "$min_turbidity", max: "$max_turbidity" }
                }
            }
        ];

        // --- Pipeline Execution ---
        // Run the aggregation against the database storage
        const aggregatedReadings = await Reading.aggregate(pipeline);

        // Handle empty results (e.g., new device with no data yet)
        if (!aggregatedReadings || aggregatedReadings.length === 0) {
            return res.status(404).json({ message: 'No readings found for this device in the selected range.' });
        }

        // Return the processed data
        res.status(200).json(aggregatedReadings);

    } catch (error) {
        console.error("Error fetching aggregated readings:", error);
        res.status(500).json({ message: "Server error while fetching readings." });
    }
};