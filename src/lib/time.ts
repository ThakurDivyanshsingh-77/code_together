interface FormatDistanceOptions {
  addSuffix?: boolean;
}

const thresholds = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
] as const;

export const formatDistanceToNow = (
  date: Date,
  options: FormatDistanceOptions = { addSuffix: false }
): string => {
  const differenceInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(differenceInSeconds);

  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });

  const threshold = thresholds.find((entry) => absoluteSeconds >= entry.seconds) || thresholds[thresholds.length - 1];
  const value = Math.round(differenceInSeconds / threshold.seconds);

  if (options.addSuffix) {
    return formatter.format(value, threshold.unit);
  }

  return formatter.formatToParts(value, threshold.unit)
    .map((part) => part.value)
    .join("")
    .replace(/^in\s+/i, "")
    .replace(/\s+ago$/i, "")
    .trim();
};
