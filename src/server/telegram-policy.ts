import { appVariant } from '../config/app-variant';

export function telegramEnabled() {
  return (
    (appVariant() === 'lite' || process.env.NODE_ENV === 'production') &&
    process.env.TELEGRAM_DISPATCH_ENABLED === 'true'
  );
}
