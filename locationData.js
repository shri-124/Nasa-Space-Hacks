

const cropCoefficients = {
	"wheat": 0.3,  // coefficient for early stage
	"corn": 0.3,
	"Maize": 0.3,
	"Wheat": 0.3,
	"Rice": 1.05,
	"Cotton": 0.35,
	"Tomatoes": 0.60,
	"Alfalfa": 0.35,
	"Sunflowers": 0.35,
	"Grapevines": 0.30
};

var watering;
var token = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2IjoxLCJ1c2VyIjoic2F0dmVkaV9jYWxlYiIsImlzcyI6ImxvZ2luLm1ldGVvbWF0aWNzLmNvbSIsImV4cCI6MTcyODIzOTkzNiwic3ViIjoiYWNjZXNzIn0.aWTGcRzwAza3sgIb7EYGRa7RktlYEbqIY2l8i72CP6HmVd-AbTbLaaDn58X_12kNtQE9nIpgsCzcNln3N4Dvgg";

function calculateWaterNeeded(kc, evapotranspiration, rainfall, sunshineDuration, windSpeed, relativeHumidity) {
	// Calculate ETc (crop evapotranspiration)
	const waterNeeded = kc * evapotranspiration;

	// Calculate environmental adjustment
	const sunshineAdjustment = (sunshineDuration / 24) * 0.1;
	const windAdjustment = (windSpeed / 10) * 0.05;
	const humidityAdjustment = (relativeHumidity / 100) * 0.1;

	// Final adjustment factor
	const adjustment = sunshineAdjustment + windAdjustment - humidityAdjustment;

	// Calculate final water need
	const finalWaterNeed = waterNeeded - rainfall + adjustment;

	// Ensure water need is not negative
	return finalWaterNeed > 0 ? finalWaterNeed : 0;
}

function parsePercipiation(jsonDictionary) {
	let result = {};
	// {"10-06-2024": {h,l}, "10-07-2024": {h,l},}


	for (const [key, value] of Object.entries(jsonDictionary)) {

		plow = Infinity;
		phigh = -Infinity;


		for (const [key2, value2] of Object.entries(value)) {
			let temp = value2[0];
			if (temp < plow) {
				plow = temp;
			}
			else if (temp > phigh) {
				phigh = temp;
			}
		}

		result[key] = [plow, phigh];
	}
}

function parseJson(JsonData, parameter, jsonDictionary) {
	const rows = JsonData.split("\n");
	const headers = rows[0].split(";");
	// console.log(parameter[0]);
	const indexList = [];
	// // Find the index of the parameter column
	for (let i = 0; i < parameter.length; i++) {
		let index = headers.indexOf(parameter[i]);
		if (index === -1) {
			console.error(`Parameter "${parameter[i]}" not found in the data.`);
			return null;
		}
		indexList.push(index - 1);
	}

	let result = {};
	// {"10-06-2024": {2, 3, 4, 5, 6}, "10-07-2024": }

	for (const [key, value] of Object.entries(jsonDictionary)) {

		let entries = [0, 0, 0, 0, 0];
		for (let i = 0; i < indexList.length; i++) {
			for (const [key2, value2] of Object.entries(value)) {
				entries[i] += parseFloat(value2[indexList[i]]);
			}
			entries[i] /= 24;
		}

		result[key] = entries;
	}



	// Extract the first row's value for the parameter (you can choose different logic for timestamp if needed)
	// result: {"10-05-2024", {0: {...}, 1: {...}, ... 23: {...}}}
	// another dictionary - key: date, value: accumulation of sum
	// {evap, rainfall, sunshineDuration, windSpeed, relativeHumidity}
	// const firstDataRow = rows[1].split(";");
	// return parseFloat(firstDataRow[0]);
	return result;
}


document.addEventListener("DOMContentLoaded", function () {
	// When the form is submitted, prevent the default behavior and capture the inputs
	const form = document.getElementById("latLongForm");

	if (form) {
		form.addEventListener("submit", function (event) {
			event.preventDefault(); // Prevents page refresh

			// Retrieve the latitude and longitude entered by the user
			const latitude = document.getElementById("latitude").value;
			const longitude = document.getElementById("longitude").value;

			// Log the coordinates to the console
			console.log("Latitude:", latitude);
			console.log("Longitude:", longitude);

			// Optional: Call your function that uses these coordinates, e.g., fetchWeatherFromCoordinates
			fetchWeatherFromCoordinates(latitude, longitude);
		});
	}
});



document.addEventListener("DOMContentLoaded", function () {
	// When the form is submitted, prevent the default behavior and capture the inputs
	const form = document.getElementById("editLocationForm");

	if (form) {
		form.addEventListener("submit", function (event) {
			event.preventDefault(); // Prevents page refresh

			// Retrieve the values entered by the user
			const city = document.getElementById("newCity").value;
			const state = document.getElementById("newState").value;

			// Pass these values to your function
			console.log(city);
			console.log(state);

			// Optional: Call your fetchWeatherFromCoordinates function here
			fetchWeatherFromLocation(city, state);
		});
	}
});


async function fetchWeatherFromLocation(city, state) {
	try {
		// First fetch: Get the coordinates from OpenCage
		const geocodeEndpoint = `https://api.opencagedata.com/geocode/v1/json?q=${city}+${state}&key=dc1e62a1979945b98a0e91e70d1d4bbc&language=en&pretty=1`;
		const geocodeResponse = await fetch(geocodeEndpoint);
		if (!geocodeResponse.ok) {
			throw new Error("Network response was not ok");
		}
		// else {
		const geocodeData = await geocodeResponse.json();
		// Extract the coordinates
		if (geocodeData.results && geocodeData.results.length > 0) {
			const coordinates = geocodeData.results[0].geometry;
			console.log(coordinates.lat, coordinates.lng);  // Log coordinates

			// Second fetch: Get the weather data from Meteomatics
			// all the available parameters: https://www.meteomatics.com/en/api/available-parameters/
			// we just need to get the date, probably need to use local data time
			/*
			Final really long url: https://api.meteomatics.com/2024-10-05T00:00:00.000-00:00--2024-10-15T00:00:00.000-00:00:PT1H/t_2m:F,prob_precip_24h:p,sunshine_duration_24h:h,absolute_humidity_2m:gm3,relative_humidity_mean_2m_24h:p,evapotranspiration_24h:mm,dew_point_2m:F,wind_speed_mean_10m_1h:kmh/40.4797828,-88.9939147/json?model=mix
			*/
			let currentDate = Date.now();
			const today = new Date(currentDate);

			// Get the day, month, and year as separate strings
			const day = today.getDate().toString();      // Get day
			const month = (today.getMonth() + 1).toString(); // Get month (0-based, so +1 is needed)
			const year = today.getFullYear().toString();  // Get year

			// Add 10 days to the current date
			const futureDate = new Date(today);
			futureDate.setDate(today.getDate() + 9);

			// Get the day, month, and year as separate strings for the future date
			const futureDay = futureDate.getDate().toString();       // Get day
			const futureMonth = (futureDate.getMonth() + 1).toString(); // Get month (0-based, so +1 is needed)
			const futureYear = futureDate.getFullYear().toString();  // Get year

			const meteoEndpoint = `https://api.meteomatics.com/${year}-${month}-${day}T00:00:00.000-00:00--${futureYear}-${futureMonth}-${futureDay}T23:00:00.000-00:00:PT1H/t_2m:F,prob_precip_24h:p,sunshine_duration_24h:h,absolute_humidity_2m:gm3,relative_humidity_mean_2m_24h:p,evapotranspiration_24h:mm,dew_point_2m:F,wind_speed_mean_10m_1h:kmh/${coordinates.lat},${coordinates.lng}/csv?model=mix&access_token=${token}`;
			const meteoResponse = await fetch(meteoEndpoint);
			if (!meteoResponse.ok) {
				throw new Error("Network response was not ok");
			}

			// Parse the CSV data as text
			const csvData = await meteoResponse.text();

			// Split the data into lines
			let lines = csvData.trim().split("\n");

			// Extract and process the headers
			let headerLine = lines[0];
			let headers = headerLine.split(";");
			// Remove 'validdate' from headers
			headers.shift();

			// // Initialize the result object
			let result = {};

			// {date: {'hour': ...}}

			// Iterate over each line of data
			for (let i = 1; i < lines.length; i++) {
				let line = lines[i].trim();
				if (line === "") continue; // Skip empty lines
				let fields = line.split(";");
				let validdate = fields[0];
				let dateTimeParts = validdate.split("T");
				let date = dateTimeParts[0]; // Date before 'T'
				let timePart = dateTimeParts[1]; // 'HH:MM:SSZ'
				let hour = Number(timePart.substring(0, 2)); // Extract 'HH'
				let values = fields.slice(1); // Get the remaining fields as an array
				// Add the values to the result object
				if (!result[date]) {
					result[date] = {};
				}
				result[date][hour] = values;
			}

			// Convert the result object to JSON
			let jsonResult = JSON.stringify(result, null, 2);
			// console.log(jsonResult);

			// Second soil moisture fetch
			const soilMoistureEndpoint = `https://api.meteomatics.com/${year}-${month}-${day}T00:00:00.000-00:00--${futureYear}-${futureMonth}-${futureDay}T00:00:00.000-00:00:PT1H/soil_moisture_deficit:mm,soil_moisture_index_-150cm:idx,soil_moisture_index_-50cm:idx,soil_moisture_index_-15cm:idx,soil_moisture_index_-5cm:idx/${coordinates.lat},${coordinates.lng}/csv?model=ecmwf-ifs&access_token=${token}`;

			const soilMoistureResponse = await fetch(soilMoistureEndpoint);
			if (!soilMoistureResponse.ok) {
				throw new Error("Network response was not ok");
			}
			const soilMoistureCsvData = await soilMoistureResponse.text();

			const dailyAvg = parseJson(csvData, ["evapotranspiration_24h:mm", "prob_precip_24h:p", "sunshine_duration_24h:h", "wind_speed_mean_10m_1h:kmh", "relative_humidity_mean_2m_24h:p"]
				, result);
			// Extract soil moisture deficit from soil moisture data
			// const soilMoistureDeficit = parseJson(soilMoistureCsvData, "soil_moisture_deficit:mm", result);
			//	console.log("this is soilMoistdeficit: " +soilMoistureDeficit);
			const cropType = "Rice";
			const kc = cropCoefficients[cropType];  // Get crop coefficient

			for (const [key, value] of Object.entries(dailyAvg)) {
				const waterNeeded = calculateWaterNeeded(kc, value[0], value[1], value[2], value[3], value[4]);
				console.log(key, waterNeeded);
			}

		} else {
			console.log("No results found for the coordinates");
		}
		//	}
	} catch (error) {
		console.error("There has been a problem with your fetch operation:", error);
	}
}

async function fetchWeatherFromCoordinates(lat, lng) {
	try {

		let currentDate = Date.now();
		const today = new Date(currentDate);

		// Get the day, month, and year as separate strings
		const day = today.getDate().toString();      // Get day
		const month = (today.getMonth() + 1).toString(); // Get month (0-based, so +1 is needed)
		const year = today.getFullYear().toString();  // Get year

		// Add 10 days to the current date
		const futureDate = new Date(today);
		futureDate.setDate(today.getDate() + 9);

		// Get the day, month, and year as separate strings for the future date
		const futureDay = futureDate.getDate().toString();       // Get day
		const futureMonth = (futureDate.getMonth() + 1).toString(); // Get month (0-based, so +1 is needed)
		const futureYear = futureDate.getFullYear().toString();  // Get year

		const meteoEndpoint = `https://api.meteomatics.com/${year}-${month}-${day}T00:00:00.000-00:00--${futureYear}-${futureMonth}-${futureDay}T23:00:00.000-00:00:PT1H/t_2m:F,prob_precip_24h:p,sunshine_duration_24h:h,absolute_humidity_2m:gm3,relative_humidity_mean_2m_24h:p,evapotranspiration_24h:mm,dew_point_2m:F,wind_speed_mean_10m_1h:kmh/${lat},${lng}/csv?model=mix&access_token=${token}`;
		const meteoResponse = await fetch(meteoEndpoint);
		if (!meteoResponse.ok) {
			throw new Error("Network response was not ok");
		}

		// Parse the CSV data as text
		const csvData = await meteoResponse.text();

		// Split the data into lines
		let lines = csvData.trim().split("\n");

		// Extract and process the headers
		let headerLine = lines[0];
		let headers = headerLine.split(";");
		// Remove 'validdate' from headers
		headers.shift();

		// // Initialize the result object
		let result = {};

		// {date: {'hour': ...}}

		// Iterate over each line of data
		for (let i = 1; i < lines.length; i++) {
			let line = lines[i].trim();
			if (line === "") continue; // Skip empty lines
			let fields = line.split(";");
			let validdate = fields[0];
			let dateTimeParts = validdate.split("T");
			let date = dateTimeParts[0]; // Date before 'T'
			let timePart = dateTimeParts[1]; // 'HH:MM:SSZ'
			let hour = Number(timePart.substring(0, 2)); // Extract 'HH'
			let values = fields.slice(1); // Get the remaining fields as an array
			// Add the values to the result object
			if (!result[date]) {
				result[date] = {};
			}
			result[date][hour] = values;
		}
		// Second soil moisture fetch
		const soilMoistureEndpoint = `https://api.meteomatics.com/${year}-${month}-${day}T00:00:00.000-00:00--${futureYear}-${futureMonth}-${futureDay}T00:00:00.000-00:00:PT1H/soil_moisture_deficit:mm,soil_moisture_index_-150cm:idx,soil_moisture_index_-50cm:idx,soil_moisture_index_-15cm:idx,soil_moisture_index_-5cm:idx/${lat},${lng}/csv?model=ecmwf-ifs&access_token=${token}`;

		const soilMoistureResponse = await fetch(soilMoistureEndpoint);
		if (!soilMoistureResponse.ok) {
			throw new Error("Network response was not ok");
		}
		const soilMoistureCsvData = await soilMoistureResponse.text();

		const dailyAvg = parseJson(csvData, ["evapotranspiration_24h:mm", "prob_precip_24h:p", "sunshine_duration_24h:h", "wind_speed_mean_10m_1h:kmh", "relative_humidity_mean_2m_24h:p"]
			, result);
		// {"10-06-2024": {5.3, 60, 10, 4, 5}, "10-07-20"}
		// Extract soil moisture deficit from soil moisture data
		// const soilMoistureDeficit = parseJson(soilMoistureCsvData, "soil_moisture_deficit:mm", result);
		//	console.log("this is soilMoistdeficit: " +soilMoistureDeficit);
		const cropType = "Rice";
		const kc = cropCoefficients[cropType];  // Get crop coefficient
		watering = {}
		for (const [key, value] of Object.entries(dailyAvg)) {
			const waterNeeded = calculateWaterNeeded(kc, value[0], value[1], value[2], value[3], value[4]);
			console.log(key, waterNeeded);
			watering[key] = waterNeeded;
		}
		return dailyAvg;


	} catch (error) {
		console.error("There has been a problem with your fetch operation:", error);
	}
}

function getWatering() {
	return watering;
}
