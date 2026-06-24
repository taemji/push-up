const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && isoDatePattern.test(value);
}

export function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function calculateCurrentStreak(completionDates: string[], todayIsoDate: string) {
  const completedDateSet = new Set(completionDates.filter(isIsoDate));
  const cursor = new Date(`${todayIsoDate}T00:00:00`);

  if (!isIsoDate(todayIsoDate) || Number.isNaN(cursor.getTime())) {
    return 0;
  }

  let streak = 0;

  while (completedDateSet.has(getLocalIsoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getMonthCalendarDays(monthIso: string) {
  const [yearText, monthText] = monthIso.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return [];
  }

  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingEmptyDays = firstDay.getDay();

  return [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => getLocalIsoDate(new Date(year, monthIndex, index + 1))),
  ];
}