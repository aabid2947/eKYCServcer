// src/services/gridlinesService.js
import axios from 'axios';

const gridlinesApi = axios.create({
  baseURL: process.env.GRIDLINES_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.GRIDLINES_API_KEY,
    // This can be set if it's always the same
    // 'X-Auth-Type': 'API-Key' 
  },
});

/**
 * Fetches Father's Name by PAN from Gridlines API.
 * @param {string} panNumber - The user's PAN number.
 * @returns {Promise<object>} The data from the API response.
 */
export const fetchPanFatherName = async (panNumber) => {
  try {
    const response = await gridlinesApi.post('/pan-api/fetch-father-name', {
      pan_number: panNumber,
      consent: 'Y', // Mandatory consent
    });
    
    if (response.data && response.data.data.code === 1014) {
      return response.data;
    } else {
      // Handle cases where the API returns a success status but an operational error
      throw new Error(response.data.data.message || 'Could not fetch PAN details.');
    }

  } catch (error) {
    console.error('Gridlines API Error:', error.response ? error.response.data : error.message);
    // Rethrow a more generic error to not expose too much detail
    throw new Error('Failed to verify PAN with external service.');
  }
};

// You can add more functions here for other Gridlines endpoints
/*
export const verifyBankAccount = async (accountNumber, ifsc) => {
  // ... logic for bank account verification
}
*/