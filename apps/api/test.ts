import { Client as GeniusClient } from 'genius-lyrics';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const genius = new GeniusClient(process.env.GENIUS_LYRICS_API);

function getBigrams(str: string): string[] {
  const s = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bigrams = [];
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.push(s.substring(i, i + 2));
  }
  return bigrams;
}

function stringSimilarity(str1: string, str2: string): number {
  const bg1 = getBigrams(str1);
  const bg2 = getBigrams(str2);
  
  if (bg1.length === 0 && bg2.length === 0) return 1;
  if (bg1.length === 0 || bg2.length === 0) return 0;
  
  let intersection = 0;
  const bg2Copy = [...bg2];
  
  for (const bg of bg1) {
    const index = bg2Copy.indexOf(bg);
    if (index !== -1) {
      intersection++;
      bg2Copy.splice(index, 1);
    }
  }
  
  return (2.0 * intersection) / (bg1.length + bg2.length);
}

function cleanSearchQuery(term: string): string {
  // Only remove stuff in square brackets like [From "Movie"]
  // Keep parentheses as they might have important info like (Title Track)
  return term.replace(/\[[^\]]*\]/g, '').trim();
}

async function testFallback(track_name: string, artist_name: string) {
  console.log(`Original: ${track_name} - ${artist_name}`);
  
  let cleanTrack = cleanSearchQuery(track_name);
  let primaryArtist = artist_name.split(/,|&|feat\.|ft\./i)[0].trim();
  
  // If track name has a hyphen (like YouTube 'Artist - Song'), parse it
  if (track_name.includes('-')) {
    const parts = track_name.split('-');
    if (parts.length >= 2) {
      primaryArtist = parts[0].trim();
      cleanTrack = parts.slice(1).join('-').trim();
    }
  }
  
  const query = `${cleanTrack} ${primaryArtist}`.trim();
  
  console.log(`Searching Genius for: "${query}"`);
  console.log(`Will score against Title: "${cleanTrack}", Artist: "${primaryArtist}"`);
  
  const searches = await genius.songs.search(query);
  
  console.log(`Genius returned ${searches.length} results.`);
  
  if (searches.length === 0) {
    console.log('No matches found.');
    return;
  }

  const candidates = searches.slice(0, 5);
  
  let bestSong = candidates[0];
  let bestScore = -1;

  candidates.forEach((s, i) => {
    // Score against the parsed track and artist, not the dirty original ones
    const titleScore = stringSimilarity(cleanTrack, s.title);
    const artistScore = stringSimilarity(primaryArtist, s.artist.name);
    const totalScore = (titleScore * 0.65) + (artistScore * 0.35);
    
    console.log(`[${i}] "${s.title}" by "${s.artist.name}" | Score: ${totalScore.toFixed(3)} (T:${titleScore.toFixed(3)} A:${artistScore.toFixed(3)})`);
    
  });

  console.log(`\n=> Selected: "${bestSong?.title}" by "${bestSong?.artist?.name}" (Score: ${bestScore.toFixed(3)})`);
}

testFallback('Luke Combs - Fast Car', 'The Vibe Guide');

