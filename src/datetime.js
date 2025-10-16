/**
 * Returns the current time in Melbourne, Australia as a formatted string.
 * @returns {string} Formatted time string in Melbourne timezone.
 */
export function getMelbourneTime() {
  const options = {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  return new Intl.DateTimeFormat('en-AU', options).format(new Date());
}