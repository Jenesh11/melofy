import { Router } from 'express';
import { lavalink } from '../index';

const router = Router();

router.get('/stream', async (req, res) => {
  const trackUrl = req.query.url as string;
  
  if (!trackUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const node = lavalink.nodeManager.leastUsedNodes()[0];
    if (!node || !node.connected) {
      return res.status(503).send('Audio bridge (NodeLink) is currently unavailable. Please try again in a moment.');
    }

    const protocol = node.options.secure ? 'https' : 'http';
    const nodeUrl = `${protocol}://${node.options.host}:${node.options.port}/v4/loadstream?encodedTrack=${encodeURIComponent(trackUrl)}`;

    console.log(`[Stream API] Fetching PCM stream from NodeLink: ${nodeUrl}`);

    const streamResponse = await fetch(nodeUrl, {
        headers: {
            'Authorization': node.options.authorization
        }
    });

    if (!streamResponse || !streamResponse.ok || !streamResponse.body) {
        console.error(`[Stream API] NodeLink Error: ${streamResponse?.status} ${streamResponse?.statusText}`);
        return res.status(500).send('Failed to retrieve direct stream from NodeLink');
    }

    // Set appropriate headers for an MP3 stream
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { spawn } = require('child_process');
    const { Readable } = require('stream');

    // Transcode PCM (s16le, 48kHz, 2ch) to MP3 using FFmpeg
    const ffmpeg = spawn('ffmpeg', [
        '-loglevel', 'error',
        '-f', 's16le',      // Input format: Signed 16-bit Little Endian PCM
        '-ar', '48000',     // Input sample rate: 48kHz
        '-ac', '2',         // Input channels: 2
        '-i', 'pipe:0',     // Read from stdin
        '-f', 'mp3',        // Output format: MP3
        '-b:a', '128k',     // Bitrate: 128kbps
        'pipe:1'            // Write to stdout
    ]);

    // Handle FFmpeg stderr
    ffmpeg.stderr.on('data', (data: any) => {
        console.error(`[FFmpeg Error] ${data}`);
    });

    // Handle process termination
    ffmpeg.on('close', (code: number) => {
        if (code !== 0 && code !== null) {
            console.error(`[FFmpeg] Process exited with code ${code}`);
        }
    });

    // Handle client disconnect
    res.on('close', () => {
        console.log('[Stream API] Client disconnected, killing FFmpeg process');
        ffmpeg.kill('SIGKILL');
    });

    // Convert Web ReadableStream to Node Readable and pipe through FFmpeg
    const pcmNodeStream = Readable.fromWeb(streamResponse.body as any);

    // Handle EPIPE errors (happens when FFmpeg or client closes the pipe)
    ffmpeg.stdin.on('error', (err: any) => {
        if (err.code === 'EPIPE') return;
        console.error(`[FFmpeg stdin Error] ${err}`);
    });

    ffmpeg.stdout.on('error', (err: any) => {
        if (err.code === 'EPIPE') return;
        console.error(`[FFmpeg stdout Error] ${err}`);
    });

    pcmNodeStream.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(res);

    console.log(`[Stream API] Successfully started streaming and transcoding`);

  } catch (error) {
    console.error('Stream routing error:', error);
    if (!res.headersSent) res.status(500).send('Internal Server Error stream routing');
  }
});

export default router;
