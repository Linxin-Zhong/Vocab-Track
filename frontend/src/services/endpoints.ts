export const ENDPOINTS = {
  USER: {
    BASE: "/user/",
    REGISTER: "/user/",
    LOGIN: "/user/login/",
    LOGOUT: "/user/logout/",
  },
  BOOK: {
    BASE: "/book/",
    WORDS: (bookId: number) => `/book/${bookId}/word/`,
  },
} as const;
