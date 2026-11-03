import type { AuthRepository } from './auth';
import { AuthService } from './auth';
import type { CallbackService } from './callbacks';
import type { ContentService } from './content';
import { EnquiryService, type EnquiryRepository } from './enquiries';
import type { PricingService } from './pricing';
import type { QuoteReads } from './quote-reads';

export type Services = {
  quoteReads?: QuoteReads;
  auth: AuthService;
  authRepository: AuthRepository;
  repository: EnquiryRepository;
  service: EnquiryService;
  content?: ContentService;
  callbacks?: CallbackService;
  pricing?: Pick<PricingService, 'get' | 'update'>;
};
