import { dayStart } from "@urnrun/core";

/** "Dive #12" after launch; pre-launch beta days are labelled by date instead. */
export function dayLabel(day: number): string {
  return day >= 1 ? `Dive #${day}` : `Beta dive · ${dayDate(day)}`;
}

export function dayDate(day: number): string {
  return dayStart(day).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
