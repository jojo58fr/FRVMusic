type SeekHandler = ((seconds: number) => void) | null;

let youtubeSeekHandler: SeekHandler = null;

export const registerYoutubeSeekHandler = (handler: SeekHandler) => {
  youtubeSeekHandler = handler;
};

export const seekYoutube = (seconds: number) => {
  youtubeSeekHandler?.(seconds);
};
