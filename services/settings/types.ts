export type Theme = "light" | "dark";

export type ReaderSettings = {
  autoAdvance?: boolean;
  autoScrollToTop?: boolean;
  highlightParagraph?: boolean;
  highlightWord?: boolean;
  playbackRate?: number;
  sleepPresetSeconds?: number;
};

export type UserSettings = {
  theme?: Theme;
  reader?: ReaderSettings;
};
