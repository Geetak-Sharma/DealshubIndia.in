import axios from 'axios';

export const prerender = false;

const DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2M2UzNTY2YWUzYzg1YzRiNzlmOTJhYmEiLCJlYXJua2FybyI6IjIwNDgzNjYiLCJpYXQiOjE3OTI2MTQ5OTZ9.YQv4Kob3s7c345CYr6So1F1xOGSyfVUG94PX7UTqn50';

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const deal = body.deal ? String(body.deal).trim() : '';
    const token = body.token || process.env.EARNKARO_API_TOKEN || DEFAULT_TOKEN;

    if (!deal) {
      return new Response(JSON.stringify({ error: 1, message: 'No deal content provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const res = await axios.post('https://ekaro-api.affiliaters.in/api/converter/public', {
      deal: deal,
      convert_option: 'convert_only'
    }, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });

    if (res.data && res.data.success) {
      const convertedText = res.data.data;
      const links = convertedText.match(/https?:\/\/[^\s"'<>]+/gi) || [];
      const primaryUrl = links[0] || convertedText;

      return new Response(JSON.stringify({
        success: 1,
        convertedText: convertedText,
        primaryUrl: primaryUrl,
        randomPostID: res.data.randomPostID
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    return new Response(JSON.stringify({
      error: 1,
      message: res.data ? res.data.message : 'Conversion failed'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    const msg = (err.response && err.response.data && err.response.data.message) ? err.response.data.message : err.message;
    return new Response(JSON.stringify({ error: 1, message: msg }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
