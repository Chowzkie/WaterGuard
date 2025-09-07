// server/controllers/readingController.js
const Reading = require('../models/Reading');

/**
 * @desc    Get historical readings for a specific device, aggregated by a time range.
 * @route   GET /api/readings/:deviceId?range=24h|7d|30d
 * @access  Private
 */
exports.getReadingsByDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { range = '7d' } = req.query; // Default to '7d' if no range is provided

        // --- 1. Calculate the Date Range ---
        const endDate = new Date();
        let startDate = new Date();
        let groupByFormat;

        switch (range) {
            case '24h':
                startDate.setDate(endDate.getDate() - 1);
                // Group by year-month-day-hour for a 24-hour view
                groupByFormat = "%Y-%m-%d-%H";
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                // Group by year-month-day for a 30-day view
                groupByFormat = "%Y-%m-%d";
                break;
            case '7d':
            default:
                startDate.setDate(endDate.getDate() - 7);
                // Group by year-month-day for a 7-day view
                groupByFormat = "%Y-%m-%d";
                break;
        }

        // --- 2. Build the MongoDB Aggregation Pipeline ---
        const pipeline = [
            // Stage 1: Filter documents to match the device and time range.
            // This is the most important step for performance.
            {
                $match: {
                    deviceId: deviceId,
                    timestamp: { $gte: startDate, $lte: endDate }
                }
            },
            // Stage 2: Group the matching documents by the calculated time interval.
            {
                $group: {
                    _id: { $dateToString: { format: groupByFormat, date: "$timestamp" } },
                    // Calculate the avg, min, and max for each parameter
                    avg_ph: { $avg: '$reading.PH' },
                    min_ph: { $min: '$reading.PH' },
                    max_ph: { $max: '$reading.PH' },
                    avg_tds: { $avg: '$reading.TDS' },
                    min_tds: { $min: '$reading.TDS' },
                    max_tds: { $max: '$reading.TDS' },
                    avg_temp: { $avg: '$reading.TEMP' },
                    min_temp: { $min: '$reading.TEMP' },
                    max_temp: { $max: '$reading.TEMP' },
                    avg_turbidity: { $avg: '$reading.TURBIDITY' },
                    min_turbidity: { $min: '$reading.TURBIDITY' },
                    max_turbidity: { $max: '$reading.TURBIDITY' },
                    // Get the timestamp of the first record in each group for the chart label
                    timestamp: { $first: '$timestamp' }
                }
            },
            // Stage 3: Sort the results chronologically.
            {
                $sort: {
                    _id: 1
                }
            },
            // Stage 4: Reshape the data for a cleaner API response.
            {
                $project: {
                    _id: 0, // Exclude the default _id field
                    timestamp: "$timestamp",
                    PH: { avg: "$avg_ph", min: "$min_ph", max: "$max_ph" },
                    TDS: { avg: "$avg_tds", min: "$min_tds", max: "$max_tds" },
                    TEMP: { avg: "$avg_temp", min: "$min_temp", max: "$max_temp" },
                    TURBIDITY: { avg: "$avg_turbidity", min: "$min_turbidity", max: "$max_turbidity" }
                }
            }
        ];

        // --- 3. Execute the Aggregation ---
        const aggregatedReadings = await Reading.aggregate(pipeline);

        if (!aggregatedReadings || aggregatedReadings.length === 0) {
            return res.status(404).json({ message: 'No readings found for this device in the selected range.' });
        }

        res.status(200).json(aggregatedReadings);

    } catch (error) {
        console.error("Error fetching aggregated readings:", error);
        res.status(500).json({ message: "Server error while fetching readings." });
    }
};