function dateFormatter(date) {
  if (
    !date ||
    typeof date !== "string" ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) // regex was made using the help of https://regex-generator.olafneumann.org/
  ) {
    return "Invalid date";
  }

  const [y, m, d] = date.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default dateFormatter;
