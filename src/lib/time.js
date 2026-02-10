const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;
const MONTH = 2592000;
const YEAR = 31536000;

export function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);

  if (seconds < MINUTE) return "just now";
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return `${m} minute${m > 1 ? "s" : ""} ago`;
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    return `${h} hour${h > 1 ? "s" : ""} ago`;
  }
  if (seconds < WEEK) {
    const d = Math.floor(seconds / DAY);
    return `${d} day${d > 1 ? "s" : ""} ago`;
  }
  if (seconds < MONTH) {
    const w = Math.floor(seconds / WEEK);
    return `${w} week${w > 1 ? "s" : ""} ago`;
  }
  if (seconds < YEAR) {
    const m = Math.floor(seconds / MONTH);
    return `${m} month${m > 1 ? "s" : ""} ago`;
  }
  const y = Math.floor(seconds / YEAR);
  return `${y} year${y > 1 ? "s" : ""} ago`;
}
