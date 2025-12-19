const isAllowedHost = (hostname) => {
  if (!hostname || typeof hostname !== 'string') return false;
  if (hostname === 'maps.googleapis.com') return true;
  if (hostname === 'streetviewpixels-pa.googleapis.com') return true;
  // 구글 사진 썸네일 도메인들 (환경/타입에 따라 다양하게 나옴)
  if (hostname.endsWith('.googleusercontent.com')) return true;
  if (hostname.endsWith('.ggpht.com')) return true;
  return false;
};

export default async function handler(req, res) {
  try {
    const raw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
    if (!raw || typeof raw !== 'string') {
      res.status(400).send('Missing url');
      return;
    }

    let target;
    try {
      target = new URL(raw);
    } catch (e) {
      res.status(400).send('Invalid url');
      return;
    }

    if (target.protocol !== 'https:') {
      res.status(400).send('Only https urls are allowed');
      return;
    }

    if (!isAllowedHost(target.hostname)) {
      res.status(403);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(`Host not allowed: ${target.hostname}`);
      return;
    }

    const upstream = await fetch(target.toString(), {
      headers: {
        // 일부 googleusercontent 리소스는 referer/user-agent 없으면 실패할 수 있음
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: 'https://www.google.com/',
      },
    });

    // 그대로 status 전달 (ex: 404 when return_error_code=true)
    res.status(upstream.status);

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    res.status(500).send('Proxy error');
  }
}


