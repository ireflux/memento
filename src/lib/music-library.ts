export interface Track {
  id: string;
  title: string;
  url: string | null;
}

export const MUSIC_LIBRARY: Track[] = [
  { id: "canon-in-d", title: "卡农 Canon in D", url: null },
  { id: "air-on-the-g-string", title: "G 弦上的咏叹调", url: null },
  { id: "birthday-jazz", title: "Happy Birthday · Jazz", url: null },
];

export function getTrack(id: string | undefined): Track | undefined {
  if (!id) return undefined;
  return MUSIC_LIBRARY.find((t) => t.id === id);
}
