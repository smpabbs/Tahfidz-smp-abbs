// API route: Fonnte WhatsApp proxy
// Serverless function for Vercel — menghindari CORS dari browser
// Digunakan oleh js/services/notification.js sebagai fallback

export default async function handler(req, res) {
  // Hanya terima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { target, message, countryCode, token } = req.body || {};

  if (!target || !message || !token) {
    return res.status(400).json({ 
      error: 'Missing required fields: target, message, token' 
    });
  }

  const FONNTE_URL = 'https://api.fonnte.com/send';

  try {
    const response = await fetch(FONNTE_URL, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        target,
        message,
        countryCode: countryCode || '62'
      })
    });

    const data = await response.json();
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Fonnte proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to send WhatsApp via Fonnte',
      detail: error.message 
    });
  }
}
