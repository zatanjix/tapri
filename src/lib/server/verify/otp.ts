import { randomInt } from 'node:crypto';

export const generateOtp = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');
