import axios from 'axios';

export const prerender = false;

const SHORT_DOMAINS = [
  'amzn.to',
  'amazn.lt',
  'amzn.in',
  'fkrt.it',
  'fkrt.co',
  'fkrt.cc',
  'bit.ly',
  'tinyurl.com',
  'cutt.ly',
  'dl.flipkart.com',
  'myntr.in',
  'myntr.it'
];

export const GET = async ({ url }) => {
  const target = url.searchParams.get('url');
  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let currentUrl = target.trim();
    if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
      currentUrl = 'https://' + currentUrl;
    }

    let hops = 0;
    while (hops < 5) {
      hops++;
      const parsed = new URL(currentUrl);
      const host = parsed.hostname.toLowerCase();
      
      const isShort = SHORT_DOMAINS.some(d => host === d || host.endsWith('.' + d));
      if (!isShort && (currentUrl.includes('/dp/') || currentUrl.includes('/gp/product/') || currentUrl.includes('/p/itm'))) {
        break;
      }

      try {
        const res = await axios.get(currentUrl, {
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          },
          timeout: 4000
        });

        if (res.headers && res.headers.location) {
          let nextUrl = res.headers.location;
          if (nextUrl.startsWith('/')) {
            nextUrl = parsed.origin + nextUrl;
          }
          currentUrl = nextUrl;
        } else {
          break;
        }
      } catch (err) {
        break;
      }
    }

    return new Response(JSON.stringify({ resolvedUrl: currentUrl }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, resolvedUrl: target }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
