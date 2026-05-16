export const formatDateTime = (date: Date): string => {
  const pad = (num: number) => num.toString().padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1); // Months are 0-based
  const year = date.getFullYear().toString().slice(-2); // Last 2 digits
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${day}-${month}-${year} \n ${hours}:${minutes}`;
};