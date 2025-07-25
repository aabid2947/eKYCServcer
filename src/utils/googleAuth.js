import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    // If we get a payload, verification was successful
    return payload;
  } catch (error) {
    // Log the detailed error for debugging on the server side.
    console.error('Detailed error verifying Google token:', error);
    
    // Return null to indicate verification failure.
    // The service layer will handle throwing the user-facing error.
    return null;
  }
};
