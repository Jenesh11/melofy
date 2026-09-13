export interface TrackItem {
  id: string;
  identifier?: string;
  title: string;
  artist: string;
  artworkUrl: string;
  duration: number;
  album?: string;
  encoded?: string;
  source?: string;
  uri?: string;
  recordingMbid?: string;
}

export interface SearchTrack {
  encoded?: string;
  info?: {
    identifier?: string;
    title?: string;
    author?: string;
    artworkUrl?: string;
    duration?: number;
    length?: number;
    sourceName?: string;
    uri?: string;
  };
}
