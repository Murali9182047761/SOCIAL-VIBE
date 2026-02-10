// Fallback to localhost only if explicitly in development mode or if no env var is provided
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const API_URL = process.env.REACT_APP_API_URL || (isLocal ? "http://localhost:4000/api" : "/api");
export const SERVER_URL = process.env.REACT_APP_SERVER_URL || (isLocal ? "http://localhost:4000" : "");
