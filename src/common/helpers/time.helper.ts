export function parseTimeToSeconds(timeStr: string, defaultValue: number = 3600): number {
  const regex = /^(\d+)([hmd])$/;
  const match = timeStr.match(regex);

  if (!match) {
    console.warn(`Invalid time format: "${timeStr}". Using default value.`);
    return defaultValue;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'h':
      return value * 60 * 60;
    case 'm':
      return value * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      console.warn(`Unknown time unit: ${unit}. Using default value.`);
      return defaultValue;
  }
}
