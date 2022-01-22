export const __prod__ = process.env.NODE_ENV === 'production';
export const COOKIE_NAME= "qid";
export const FRONT_END_URL = "http://localhost:3000"
export const RECOMMENDER_API_BASE_URL = "http://localhost:8000/"
export const REGEX_PATTERNS = {
    hasNumber: /\d/,
    hasNoSymbols: /^[a-zA-Z0-9 ]*$/,
    hasUppercase: /[A-Z]/,
    hasLowercase: /[a-z]/,
}
export const MAX_ANIME_FETCH_LIMIT = 1000