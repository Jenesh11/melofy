import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const track_name = req.query.track_name as string;
    const artist_name = req.query.artist_name as string;
    const album_name = req.query.album_name as string;
    const duration = req.query.duration as string;

    if (!track_name || !artist_name) {
      return res
        .status(400)
        .json({ error: 'Missing track_name or artist_name query parameters' });
    }

    const url = new URL('https://lrclib.net/api/get');
    url.searchParams.append('track_name', track_name);
    url.searchParams.append('artist_name', artist_name);

    if (album_name) {
      url.searchParams.append('album_name', album_name);
    }

    if (duration) {
      url.searchParams.append('duration', duration);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Melofy (https://github.com/ShreyJaiswal1/melofy)',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Lyrics not found' });
      }
      console.error(
        `lrclib API error: ${response.status} ${response.statusText}`,
      );
      const text = await response.text();
      console.error(`Response text: ${text}`);
      return res
        .status(response.status)
        .json({ error: 'Failed to fetch lyrics' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Lyrics fetch error:', error);
    return res
      .status(500)
      .json({ error: 'Internal Server Error fetching lyrics' });
  }
});

export default router;
