function durationFormatter(duration) {
  if (!duration || !Number.isInteger(duration) || duration <= 0) {
    return `Invalid duration`;
  }

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default durationFormatter;
