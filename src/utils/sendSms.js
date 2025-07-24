import axios from 'axios';

const sendSms = async (mobileNumber, message) => {
    // Note: It's recommended to include the country code in the mobile number.
    // SMSCountry API expects the number without the leading '+' or '0'.
    // e.g., for +919999999999, you'd use 919999999999.
    // The following line assumes an Indian number if no country code is present.
    const formattedMobileNumber = mobileNumber.startsWith('91') ? mobileNumber : `91${mobileNumber}`;

    const smsData = {
        text: message,
        sender: process.env.SMSCOUNTRY_SENDER_ID,
        to: [
            {
                number: formattedMobileNumber,
            },
        ],
    };

    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SMSCOUNTRY_AUTH_KEY}`,
        },
    };

    try {
        const response = await axios.post('https://api.smscountry.com/v2/sendsms', smsData, config);
        
        console.log('SMS Sent Successfully:', response.data);
        return response.data;

    } catch (error) {
        console.error('Error sending SMS via SMSCountry:', error.response ? error.response.data : error.message);
        throw new Error('Failed to send SMS.');
    }
};

export default sendSms;
