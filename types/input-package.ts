export type BookManifest = {
  book_id: string;
  chapters: Array<{
    order_index: number;
    chapter_id: string;
    title: string;
    assets: {
      text_html: string;
      text_json: string;
      align_json: string;
      audio_mp3?: string;
    };
  }>;
};
