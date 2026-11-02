import { appVariant } from '../config/app-variant';

export function telegramEnabled() {
  return (
    appVariant() === 'lite' && process.env.TELEGRAM_DISPATCH_ENABLED === 'true'
  );
}
