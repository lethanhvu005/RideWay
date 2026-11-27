import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { apiFetch } from '../api/client';
import type {
  BookingDetail,
  DestinationItem,
  LocationItem,
  PostDetail,
  PostSummary,
  TicketItem,
  TripDetail,
  TripSummary,
  UserProfile,
  VehicleTypeItem,
} from '../types/models';
import type { TripUnitItem } from '../components/SeatLayout2Deck';
import type { ActiveHoldBooking } from '../components/CheckoutFlowModal';

interface ApiFetchArgs {
  url: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

const csrfAwareBaseQuery: BaseQueryFn<
  string | ApiFetchArgs,
  unknown,
  { status?: number; message: string }
> = async (arg) => {
  try {
    const req: ApiFetchArgs = typeof arg === 'string' ? { url: arg } : arg;
    const data = await apiFetch(req.url, {
      method: req.method || 'GET',
      headers: req.headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
    });
    return { data };
  } catch (err) {
    return {
      error: {
        message: err instanceof Error ? err.message : 'Lỗi kết nối máy chủ',
      },
    };
  }
};

export const ridewayApi = createApi({
  reducerPath: 'ridewayApi',
  baseQuery: csrfAwareBaseQuery,
  tagTypes: [
    'Me',
    'Locations',
    'VehicleTypes',
    'Trips',
    'TripDetail',
    'TripUnits',
    'Destinations',
    'Posts',
    'Bookings',
    'Tickets',
    'Partner',
    'Admin',
  ],
  endpoints: (builder) => ({
    getMe: builder.query<UserProfile | null, void>({
      async queryFn(_arg, _api, _extra, baseQuery) {
        const res = await baseQuery('/me');
        if (res.error) return { data: null };
        return { data: res.data as UserProfile };
      },
      providesTags: ['Me'],
    }),
    getLocations: builder.query<LocationItem[], void>({
      query: () => '/locations',
      transformResponse: (res: { results: LocationItem[] }) => res.results ?? [],
      providesTags: ['Locations'],
    }),
    getVehicleTypes: builder.query<VehicleTypeItem[], void>({
      query: () => '/vehicle-types',
      transformResponse: (res: { results: VehicleTypeItem[] }) => res.results ?? [],
      providesTags: ['VehicleTypes'],
    }),
    getTrips: builder.query<
      TripSummary[],
      {
        fromLocationId?: string;
        toLocationId?: string;
        fromSequence?: number;
        toSequence?: number;
        departureDate?: string;
        sort?: string;
      } | void
    >({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params) {
          if (params.fromLocationId) qs.set('from_location_id', params.fromLocationId);
          if (params.toLocationId) qs.set('to_location_id', params.toLocationId);
          if (!params.fromLocationId && !params.toLocationId) {
            if (params.fromSequence !== undefined) qs.set('from_sequence', String(params.fromSequence));
            if (params.toSequence !== undefined) qs.set('to_sequence', String(params.toSequence));
          }
          if (params.departureDate) qs.set('departure_date', params.departureDate);
          if (params.sort) qs.set('sort', params.sort);
        }
        const queryString = qs.toString();
        return `/trips${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (res: { results: TripSummary[] }) => res.results ?? [],
      providesTags: ['Trips'],
    }),
    getTripDetail: builder.query<TripDetail, string>({
      query: (tripId) => `/trips/${tripId}`,
      providesTags: (_res, _err, tripId) => [{ type: 'TripDetail', id: tripId }],
    }),
    getTripUnits: builder.query<
      TripUnitItem[],
      { tripId: string; fromSequence: number; toSequence: number }
    >({
      query: ({ tripId, fromSequence, toSequence }) =>
        `/trips/${tripId}/units?from_sequence=${fromSequence}&to_sequence=${toSequence}`,
      transformResponse: (res: { units: TripUnitItem[] }) => res.units ?? [],
      providesTags: (_res, _err, arg) => [{ type: 'TripUnits', id: arg.tripId }],
    }),
    getDestinations: builder.query<DestinationItem[], void>({
      query: () => '/destinations',
      transformResponse: (res: { results: DestinationItem[] }) => res.results ?? [],
      providesTags: ['Destinations'],
    }),
    getPosts: builder.query<PostSummary[], void>({
      query: () => '/posts',
      transformResponse: (res: { results: PostSummary[] }) => res.results ?? [],
      providesTags: ['Posts'],
    }),
    getPostBySlug: builder.query<PostDetail, string>({
      query: (slug) => `/posts/${slug}`,
      providesTags: (_res, _err, slug) => [{ type: 'Posts', id: slug }],
    }),
    createHold: builder.mutation<
      ActiveHoldBooking,
      {
        trip_id: string;
        from_sequence: number;
        to_sequence: number;
        units: Array<{ trip_unit_id: string; adult_count: number; child_count: number }>;
      }
    >({
      query: (payload) => ({
        url: '/holds',
        method: 'POST',
        headers: {
          'Idempotency-Key': `hold-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
        body: payload,
      }),
      invalidatesTags: ['TripUnits', 'Bookings'],
    }),
    getBookingDetail: builder.query<BookingDetail, string>({
      query: (bookingId) => `/bookings/${bookingId}`,
      providesTags: (_res, _err, id) => [{ type: 'Bookings', id }],
    }),
    getMyBookings: builder.query<Array<Record<string, unknown>>, void>({
      query: () => '/me/bookings',
      transformResponse: (res: { results: Array<Record<string, unknown>> }) => res.results ?? [],
      providesTags: ['Bookings'],
    }),
    getMyTickets: builder.query<TicketItem[], void>({
      query: () => '/me/tickets',
      transformResponse: (res: { results: TicketItem[] }) => res.results ?? [],
      providesTags: ['Tickets'],
    }),
  }),
});

export const {
  useGetMeQuery,
  useGetLocationsQuery,
  useGetVehicleTypesQuery,
  useGetTripsQuery,
  useGetTripDetailQuery,
  useGetTripUnitsQuery,
  useGetDestinationsQuery,
  useGetPostsQuery,
  useGetPostBySlugQuery,
  useCreateHoldMutation,
  useGetBookingDetailQuery,
  useGetMyBookingsQuery,
  useGetMyTicketsQuery,
} = ridewayApi;
