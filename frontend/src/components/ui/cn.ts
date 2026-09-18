import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names, with later Tailwind utilities winning. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
