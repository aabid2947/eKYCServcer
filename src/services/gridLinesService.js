/**
 * @file Gridlines API Service
 * @description This file contains a collection of functions to interact with the Gridlines API.
 * It handles authentication, request formatting, and response processing for various endpoints.
 * 
 * @requires an environment variable `REACT_APP_GRIDLINES_API_KEY` to be set with your API key.
 * You can create a `.env` file in your project's root and add the following line:
 * REACT_APP_GRIDLINES_API_KEY=YOUR_API_KEY
 */

const API_BASE_URL = 'https://api.gridlines.io/profile-api/';
// It's highly recommended to use environment variables for API keys.
const API_KEY = "qwXZAALB1F1zNIr3uctyypnHZbMlEu8G";

/**
 * A generic helper function to make POST requests with a JSON body.
 * It automatically adds the API key and consent parameter.
 * @param {string} endpoint - The API endpoint path (e.g., 'profile-api/mobile/address-lookup').
 * @param {object} body - The request body object.
 * @returns {Promise<object>} - A promise that resolves to the 'data' object from the API response.
 * @throws {Error} - Throws an error if the API call fails or returns a non-200 status.
 */
const callJsonApi = async (endpoint, body = {}) => {
    if (!API_KEY) {
        throw new Error("Gridlines API key is not configured. Please set REACT_APP_GRIDLINES_API_KEY.");
    }

    const requestBody = {
        ...body,
        consent: "Y", // Mandatory consent parameter
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
             headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'X-Auth-Type': 'API-Key',
                'X-Reference-ID': body.reference_id || '',
            },
            body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!response.ok || result.status !== 200) {
            console.error(`❌ API error details:
  • Status: ${response.status}
  • Status Text: ${response.statusText}
  • Response Body:`, result);

            throw new Error(result.message || `API request failed with status ${response.status}`);
        }

        return result.data;
    } catch (error) {
        console.error(`❌ Error calling Gridlines endpoint ${endpoint}:`, error);
        throw error;
    }
};

/**
 * A generic helper function to make POST requests with FormData (for file uploads).
 * It automatically adds the API key and consent parameter.
 * @param {string} endpoint - The API endpoint path.
 * @param {FormData} formData - The FormData object containing the file(s).
 * @returns {Promise<object>} - A promise that resolves to the 'data' object from the API response.
 * @throws {Error} - Throws an error if the API call fails or returns a non-200 status.
 */
const callFormApi = async (endpoint, formData) => {
    if (!API_KEY) {
        throw new Error("Gridlines API key is not configured. Please set REACT_APP_GRIDLINES_API_KEY.");
    }

    formData.append('consent', 'Y'); // Add mandatory consent

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'X-Auth-Type': 'API-Key',
                'X-Reference-ID': body.reference_id || '',
            },
            body: formData,
        });

        const result = await response.json();

        if (!response.ok || result.status !== 200) {
            throw new Error(result.message || `API request failed with status ${response.status}`);
        }

        return result.data;
    } catch (error) {
        console.error(`Error calling Gridlines file-upload endpoint ${endpoint}:`, error);
        throw error; // Re-throw the error to be handled by the caller
    }
};


// =================================================================
// 1. Profile & Address Verification
// =================================================================

/**
 * Retrieves verified address details for a given mobile number.
 * @param {string} mobile_number - The mobile number to look up.
 * @returns {Promise<object>} - The address details.
 */
export const getAddressByMobile = async (individualData) => {
    return callJsonApi('profile-api/individual/fetch-address', individualData);
};

// =================================================================
// 2. PAN (Permanent Account Number) Verification
// =================================================================

/**
 * Retrieves the father's name associated with a PAN.
 * @param {string} pan_number - The PAN to verify.
 * @returns {Promise<object>} - The father's name information.
 */
export const getFathersNameByPan = async (pan_number) => {
    return callJsonApi('pan-api/fetch-father-name', { pan_number });
};

/**
 * Fetches a company's CIN using its PAN.
 * @param {string} pan_number - The company's PAN.
 * @returns {Promise<object>} - The CIN information.
 */
export const getCinByPan = async (pan_number) => {
    return callJsonApi('mca-api/cin-by-pan', { pan_number });
};

/**
 * Fetches a director's DIN using their PAN.
 * @param {string} pan_number - The director's PAN.
 * @returns {Promise<object>} - The DIN information.
 */
export const getDinByPan = async (pan_number) => {
    return callJsonApi('mca-api/fetch-din-by-pan', { pan_number });
};

/**
 * Checks if a given PAN and Aadhaar number are linked.
 * @param {string} pan_number - The PAN number.
 * @param {string} aadhaar_number - The Aadhaar number.
 * @returns {Promise<object>} - The linkage status.
 */
export const checkAadhaarPanLink = async (pan_number, aadhaar_number) => {
    return callJsonApi('pan-api/check-aadhaar-link', { pan_number, aadhaar_number });
};


// =================================================================
// 3. Aadhaar Verification
// =================================================================

/**
 * Extracts all text data from an Aadhaar card image using OCR.
 * @param {File} file_front - The image file of the front of the Aadhaar card.
 * @returns {Promise<object>} - The extracted data.
 */
export const extractAadhaarDataFromImage = async (file_front) => {
    const formData = new FormData();
    formData.append('file_front', file_front);
    return callFormApi('aadhaar-api/ocr/v2', formData);
};


// =================================================================
// 4. GSTIN Verification
// =================================================================

/**
 * Fetches brief, public details for a given GSTIN.
 * @param {string} gstin - The GSTIN to look up.
 * @returns {Promise<object>} - Brief details of the GSTIN.
 */
export const getGstinLiteDetails = async (gstin) => {
    return callJsonApi('gstin-api/fetch-lite', { gstin });
};

/**
 * Fetches the registered contact details for a GSTIN.
 * @param {string} gstin - The GSTIN to look up.
 * @returns {Promise<object>} - The contact details for the GSTIN.
 */
export const getGstinContactDetails = async (gstin) => {
    return callJsonApi('gstin-api/fetch-contact-details', { gstin });
};


// =================================================================
// 5. Bank Account Verification
// =================================================================

/**
 * Verifies a bank account and retrieves the account holder's name.
 * @param {string} account_number - The bank account number.
 * @param {string} ifsc - The IFSC code of the bank branch.
 * @returns {Promise<object>} - The verification status and account holder's name.
 */
export const verifyBankAccount = async (account_number, ifsc) => {
    return callJsonApi('bank-api/verify', { account_number, ifsc });
};

/**
 * Extracts details from a bank cheque image using OCR.
 * @param {File} file_front - The image file of the cheque.
 * @returns {Promise<object>} - The extracted cheque details.
 */
export const extractChequeDataFromImage = async (file_front) => {
    const formData = new FormData();
    formData.append('file_front', file_front);
    return callFormApi('bank-api/cheque/ocr', formData);
};


// =================================================================
// 6. Driving License (DL) Verification
// =================================================================

/**
 * Fetches details for a valid driving license.
 * @param {string} driving_license_number - The DL number.
 * @param {string} date_of_birth - The date of birth in 'YYYY-MM-DD' format.
 * @returns {Promise<object>} - The driving license details.
 */
export const getDrivingLicenseDetails = async (driving_license_number, date_of_birth) => {
    return callJsonApi('dl-api/fetch', { driving_license_number, date_of_birth });
};

/**
 * Extracts text data from a driving license image using OCR.
 * @param {File} file_front - The image file of the driving license.
 * @returns {Promise<object>} - The extracted data.
 */
export const extractDrivingLicenseDataFromImage = async (file_front) => {
    const formData = new FormData();
    formData.append('file_front', file_front);
    return callFormApi('dl-api/ocr', formData);
};


// =================================================================
// 7. Employment (EPFO) Verification
// =================================================================

/**
 * Fetches the last known employment details from the EPFO database.
 * @param {string} uan - The Universal Account Number.
 * @returns {Promise<object>} - The latest employment details.
 */
export const getLatestEmploymentDetails = async (uan) => {
    return callJsonApi('epfo-api/employment-history/fetch-latest', { uan });
};


// =================================================================
// 8. Face Match
// =================================================================

/**
 * Compares two face images and returns a confidence score.
 * @param {File} file_1 - The first face image file.
 * @param {File} file_2 - The second face image file.
 * @returns {Promise<object>} - The face match result and confidence score.
 */
export const verifyFaceMatch = async (file_1, file_2) => {
    const formData = new FormData();
    formData.append('file_1', file_1);
    formData.append('file_2', file_2);
    // Note: The API also accepts URLs or base64. This implementation uses files.
    // To use other formats, call `callJsonApi` with the appropriate body.
    return callFormApi('face-api/verify', formData);
};


// =================================================================
// 9. DigiLocker Integration
// =================================================================

/**
 * Starts the DigiLocker authentication process.
 * @param {string} redirect_uri - The URL to redirect to after authentication.
 * @returns {Promise<object>} - The authorization URL.
 */
export const initiateDigilockerAuth = async (redirect_uri) => {
    return callJsonApi('digilocker/init', { redirect_uri });
};

/**
 * Adds a user's PAN card to their DigiLocker account.
 * @param {object} parameters - Object containing panno and PANFullName.
 * @param {string} parameters.panno - The user's PAN number.
 * @param {string} parameters.PANFullName - The user's full name as on PAN.
 * @returns {Promise<object>} - The result of the pull document operation.
 */
export const pullDigilockerPanDocument = async (parameters) => {
    return callJsonApi('digilocker/pan/pull-document', { parameters });
};


// =================================================================
// 10. Corporate and Financial Verification
// =================================================================

/**
 * Fetches detailed company information from the MCA.
 * @param {string} company_id - The CIN or LLPIN of the company.
 * @returns {Promise<object>} - The detailed company information.
 */
export const getCompanyDetails = async (company_id) => {
    return callJsonApi('mca-api/fetch-company', { company_id });
};

/**
 * Fetches pending traffic fines (e-challans) for a vehicle.
 * @param {string} rc_number - The vehicle's registration certificate number.
 * @param {string} chassis_number - The vehicle's chassis number.
 * @param {string} engine_number - The vehicle's engine number.
 * @returns {Promise<object>} - The list of e-challans.
 */
export const getVehicleEChallans = async (rc_number, chassis_number, engine_number) => {
    return callJsonApi('rc-api/echallan/fetch', { rc_number, chassis_number, engine_number });
};

/**
 * Fetches a detailed credit report (from Equifax) for an individual.
 * @param {object} details - The personal details of the individual.
 * @param {string} details.phone - The individual's phone number.
 * @param {string} details.full_name - The individual's full name.
 * @param {string} details.pan - The individual's PAN number.
 * @param {string} details.address - The individual's full address.
 * @param {string} details.date_of_birth - The individual's DOB in 'YYYY-MM-DD' format.
 * @returns {Promise<object>} - The credit bureau profile.
 */
export const getBureauProfile = async (details) => {
    const { phone, full_name, pan, address, date_of_birth } = details;
    return callJsonApi('profile-api/bureau/fetch-profile', { phone, full_name, pan, address, date_of_birth });
};