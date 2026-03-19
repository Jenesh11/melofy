export interface TrackItem {
  id: string;
  identifier?: string;
  title: string;
  artist: string;
  artworkUrl: string;
  duration: number;
  album?: string;
  encoded?: string;
}
