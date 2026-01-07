export type FeedbackItem = {
  id: string;
  book_id: string;
  chapter_id: string;
  pid: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
};

export type ChapterFeedbackItem = {
  id: string;
  book_id: string;
  chapter_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
};

export type BookFeedbackItem = {
  id: string;
  book_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
};
