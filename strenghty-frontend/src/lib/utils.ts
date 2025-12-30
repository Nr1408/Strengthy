import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUnit(): 'lbs' | 'kg' {
  try {
    const u = localStorage.getItem('unit');
    return u === 'kg' ? 'kg' : 'lbs';
  } catch {
    return 'lbs';
  }
}

export function setUnit(u: 'lbs' | 'kg') {
  try {
    localStorage.setItem('unit', u);
  } catch {}
}
