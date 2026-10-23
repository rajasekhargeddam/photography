import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  ceremoniesForEvent,
  coverageFor,
  newCeremony,
  type Ceremony,
  type QuoteDraft,
  type QuoteItem,
} from './quote';
export type EnquirySession = { id: string; token: string };
export type SavedEnquiry = {
  id: string;
  revision: string;
  status: 'ATTEMPTED' | 'CONFIRMED';
  requestKey: string;
  total: number;
  items: QuoteItem[];
};
export type BookingDraft = QuoteDraft & {
  session: EnquirySession | null;
  saved: SavedEnquiry | null;
  completedReference: string | null;
  completedQuote: { details: QuoteDraft; saved: SavedEnquiry } | null;
  questionId: string;
};
export const initialBooking: BookingDraft = {
  quoteVersion: 2,
  eventType: '',
  ceremonies: [],
  albumQuantity: 0,
  name: '',
  mobile: '',
  notes: '',
  session: null,
  saved: null,
  completedReference: null,
  completedQuote: null,
  questionId: 'intro',
  albumSize: '12x36',
  albumDelivery: 'discuss',
};
const slice = createSlice({
  name: 'booking',
  initialState: initialBooking,
  reducers: {
    setSession(state, action: PayloadAction<EnquirySession>) {
      state.session = action.payload;
    },
    enquirySaved(state, action: PayloadAction<SavedEnquiry>) {
      state.saved = action.payload;
    },
    enquiryConfirmed: (state, action: PayloadAction<string>) => {
      const {
        quoteVersion,
        eventType,
        ceremonies,
        albumQuantity,
        albumSize,
        albumDelivery,
        name,
        mobile,
        notes,
      } = state;
      return {
        ...initialBooking,
        completedReference: action.payload,
        completedQuote: state.saved
          ? {
              details: {
                quoteVersion,
                eventType,
                ceremonies,
                albumQuantity,
                albumSize,
                albumDelivery,
                name,
                mobile,
                notes,
              },
              saved: { ...state.saved, status: 'CONFIRMED' as const },
            }
          : null,
      };
    },
    setQuestion(state, action: PayloadAction<string>) {
      state.questionId = action.payload;
    },
    setAlbumPreferences(
      state,
      action: PayloadAction<
        Partial<Pick<BookingDraft, 'albumSize' | 'albumDelivery'>>
      >,
    ) {
      Object.assign(state, action.payload);
    },
    setServiceQuantity(
      state,
      action: PayloadAction<{
        ceremonyId: string;
        serviceId: string;
        quantity: number;
      }>,
    ) {
      const c = state.ceremonies.find(
        (c) => c.id === action.payload.ceremonyId,
      );
      if (!c || !c.serviceIds.includes(action.payload.serviceId)) return;
      c.quantities[action.payload.serviceId] = action.payload.quantity;
    },
    chooseEvent(state, action: PayloadAction<string>) {
      if (
        state.eventType === action.payload ||
        !ceremoniesForEvent(action.payload).length
      )
        return;
      state.eventType = action.payload;
      state.ceremonies =
        action.payload === 'Marriage'
          ? [newCeremony('wedding')]
          : [newCeremony('shoot')];
      state.albumQuantity = 0;
      state.albumSize = '12x36';
      state.albumDelivery = 'discuss';
    },
    toggleCeremony(state, action: PayloadAction<string>) {
      if (
        !ceremoniesForEvent(state.eventType).some(
          (c) => c.id === action.payload,
        )
      )
        return;
      state.ceremonies = state.ceremonies.some((c) => c.id === action.payload)
        ? state.ceremonies.filter((c) => c.id !== action.payload)
        : [...state.ceremonies, newCeremony(action.payload)];
    },
    updateCeremony(
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<
          Pick<Ceremony, 'date' | 'dateUndecided' | 'location' | 'days'>
        >;
      }>,
    ) {
      const c = state.ceremonies.find((c) => c.id === action.payload.id);
      if (!c) return;
      Object.assign(c, action.payload.changes);
      if (c.dateUndecided) c.date = '';
    },
    toggleService(
      state,
      action: PayloadAction<{ ceremonyId: string; serviceId: string }>,
    ) {
      const { ceremonyId, serviceId } = action.payload;
      const c = state.ceremonies.find((c) => c.id === ceremonyId);
      if (!c) return;
      if (!coverageFor(state.eventType, c.id).some((s) => s.id === serviceId))
        return;
      c.serviceIds = c.serviceIds.includes(serviceId)
        ? c.serviceIds.filter((id) => id !== serviceId)
        : [...c.serviceIds, serviceId];
      if (!c.serviceIds.includes(serviceId)) delete c.quantities[serviceId];
    },
    setAlbumQuantity(state, action: PayloadAction<number>) {
      state.albumQuantity = action.payload;
    },
    setDetails(
      state,
      action: PayloadAction<
        Partial<Pick<BookingDraft, 'name' | 'mobile' | 'notes'>>
      >,
    ) {
      Object.assign(state, action.payload);
    },
    resetBooking: () => initialBooking,
  },
});
export const bookingActions = slice.actions;
export const bookingReducer = slice.reducer;
