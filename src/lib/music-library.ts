export interface Track {
  id: string;
  title: string;
  /**
   * 音频文件公开 URL（mp3，≤2MB 建议）。
   * 上架方式：把文件上传到 ImgBed 的 memento/music/ 目录，
   * 然后把返回的 URL 填到这里；url 为 null 的曲目不会出现在宾客端。
   */
  url: string | null;
}

export const MUSIC_LIBRARY: Track[] = [
  { id: "canon-in-d", title: "卡农 Canon in D", url: null },
  { id: "air-on-the-g-string", title: "G 弦上的咏叹调", url: null },
  { id: "birthday-jazz", title: "Happy Birthday · Jazz", url: null },
];

/** 可被宾客实际播放的曲目（url 已上架）。 */
export function availableTracks(): Track[] {
  return MUSIC_LIBRARY.filter((t) => Boolean(t.url));
}

export function getTrack(id: string | undefined): Track | undefined {
  if (!id) return undefined;
  return MUSIC_LIBRARY.find((t) => t.id === id);
}
