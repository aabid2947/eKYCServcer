import admin from 'firebase-admin';

// IMPORTANT: You must set up a service account for this to work.
// 1. Go to your Firebase project settings -> Service accounts.
// 2. Click "Generate new private key" and save the JSON file securely.
// 3. Set an environment variable named GOOGLE_APPLICATION_CREDENTIALS
//    to the full path of this JSON file.
//    e.g., GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      // The SDK automatically finds the credentials from the environment variable.
    });
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}


/**
 * Verifies a Firebase ID token.
 * @param {string} token The Firebase ID token to verify.
 * @returns {Promise<admin.auth.DecodedIdToken|null>} The decoded token payload if valid, otherwise null.
 */
export const verifyFirebaseToken = async (token) => {
  if (!token) {
    return null;
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return null;
  }
};

export default admin;
