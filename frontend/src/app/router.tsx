import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { ScrollToTop } from '../components/common/ScrollToTop';
import { AccountLayout } from '../layouts/AccountLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { PartnerLayout } from '../layouts/PartnerLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { HomePage } from '../pages/HomePage';

/* Lazy-loaded Route Chunks (Route-level Code Splitting) */
const BusLandingPage = lazy(() =>
  import('../pages/buses/BusLandingPage').then((m) => ({ default: m.BusLandingPage }))
);
const BusSearchPage = lazy(() =>
  import('../pages/buses/BusSearchPage').then((m) => ({ default: m.BusSearchPage }))
);
const BusTripDetailPage = lazy(() =>
  import('../pages/buses/BusTripDetailPage').then((m) => ({ default: m.BusTripDetailPage }))
);
const BusSeatSelectionPage = lazy(() =>
  import('../pages/buses/BusSeatSelectionPage').then((m) => ({ default: m.BusSeatSelectionPage }))
);

const BookingCheckoutPage = lazy(() =>
  import('../pages/booking/BookingCheckoutPage').then((m) => ({ default: m.BookingCheckoutPage }))
);
const BookingPaymentPage = lazy(() =>
  import('../pages/booking/BookingPaymentPage').then((m) => ({ default: m.BookingPaymentPage }))
);
const PaymentResultPage = lazy(() =>
  import('../pages/booking/PaymentResultPage').then((m) => ({ default: m.PaymentResultPage }))
);
const TicketDetailPage = lazy(() =>
  import('../pages/booking/TicketDetailPage').then((m) => ({ default: m.TicketDetailPage }))
);

const FlightsLandingPage = lazy(() =>
  import('../pages/flights/FlightsPages').then((m) => ({ default: m.FlightsLandingPage }))
);
const FlightsSearchPage = lazy(() =>
  import('../pages/flights/FlightsPages').then((m) => ({ default: m.FlightsSearchPage }))
);

const RailwaysLandingPage = lazy(() =>
  import('../pages/railways/RailwaysPages').then((m) => ({ default: m.RailwaysLandingPage }))
);
const RailwaysSearchPage = lazy(() =>
  import('../pages/railways/RailwaysPages').then((m) => ({ default: m.RailwaysSearchPage }))
);

const RentalsLandingPage = lazy(() =>
  import('../pages/rentals/RentalsPages').then((m) => ({ default: m.RentalsLandingPage }))
);
const RentalsListPage = lazy(() =>
  import('../pages/rentals/RentalsPages').then((m) => ({ default: m.RentalsListPage }))
);
const RentalDetailPage = lazy(() =>
  import('../pages/rentals/RentalsPages').then((m) => ({ default: m.RentalDetailPage }))
);

const OperatorsListPage = lazy(() =>
  import('../pages/operators/OperatorsPages').then((m) => ({ default: m.OperatorsListPage }))
);
const OperatorDetailPage = lazy(() =>
  import('../pages/operators/OperatorsPages').then((m) => ({ default: m.OperatorDetailPage }))
);

const DestinationsListPage = lazy(() =>
  import('../pages/destinations/DestinationsPages').then((m) => ({ default: m.DestinationsListPage }))
);
const DestinationDetailPage = lazy(() =>
  import('../pages/destinations/DestinationsPages').then((m) => ({ default: m.DestinationDetailPage }))
);

const NewsListPage = lazy(() =>
  import('../pages/news/NewsPages').then((m) => ({ default: m.NewsListPage }))
);
const NewsDetailPage = lazy(() =>
  import('../pages/news/NewsPages').then((m) => ({ default: m.NewsDetailPage }))
);

const AboutPage = lazy(() =>
  import('../pages/info/InfoPages').then((m) => ({ default: m.AboutPage }))
);
const ContactPage = lazy(() =>
  import('../pages/info/InfoPages').then((m) => ({ default: m.ContactPage }))
);
const TermsPage = lazy(() =>
  import('../pages/info/InfoPages').then((m) => ({ default: m.TermsPage }))
);
const PolicyPage = lazy(() =>
  import('../pages/info/InfoPages').then((m) => ({ default: m.PolicyPage }))
);
const NotFoundPage = lazy(() =>
  import('../pages/info/InfoPages').then((m) => ({ default: m.NotFoundPage }))
);

const LoginPage = lazy(() =>
  import('../pages/account/AccountPages').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('../pages/account/AccountPages').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('../pages/account/AccountPages').then((m) => ({ default: m.ForgotPasswordPage }))
);
const AccountProfilePage = lazy(() =>
  import('../pages/account/AccountPages').then((m) => ({ default: m.AccountProfilePage }))
);
const AccountOrdersPage = lazy(() =>
  import('../pages/account/AccountPages').then((m) => ({ default: m.AccountOrdersPage }))
);
const AccountOrderDetailPage = lazy(() =>
  import('../pages/account/AccountPages').then((m) => ({ default: m.AccountOrderDetailPage }))
);

const PartnerDashboardPage = lazy(() =>
  import('../pages/partner/PartnerPages').then((m) => ({ default: m.PartnerDashboardPage }))
);
const PartnerVehiclesPage = lazy(() =>
  import('../pages/partner/PartnerPages').then((m) => ({ default: m.PartnerVehiclesPage }))
);
const PartnerRoutesPage = lazy(() =>
  import('../pages/partner/PartnerPages').then((m) => ({ default: m.PartnerRoutesPage }))
);
const PartnerTripsPage = lazy(() =>
  import('../pages/partner/PartnerPages').then((m) => ({ default: m.PartnerTripsPage }))
);
const PartnerPricingPage = lazy(() =>
  import('../pages/partner/PartnerPages').then((m) => ({ default: m.PartnerPricingPage }))
);
const PartnerPassengersPage = lazy(() =>
  import('../pages/partner/PartnerPages').then((m) => ({ default: m.PartnerPassengersPage }))
);
const PartnerBookingsPage = lazy(() =>
  import('../pages/partner/PartnerPages').then((m) => ({ default: m.PartnerBookingsPage }))
);
const PartnerStaffPage = lazy(() =>
  import('../pages/partner/PartnerPages').then((m) => ({ default: m.PartnerStaffPage }))
);
const PartnerReportsPage = lazy(() =>
  import('../pages/partner/PartnerPages').then((m) => ({ default: m.PartnerReportsPage }))
);

const AdminDashboardPage = lazy(() =>
  import('../pages/admin/AdminPages').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminOperatorsPage = lazy(() =>
  import('../pages/admin/AdminPages').then((m) => ({ default: m.AdminOperatorsPage }))
);
const AdminUsersPage = lazy(() =>
  import('../pages/admin/AdminPages').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminTripsPage = lazy(() =>
  import('../pages/admin/AdminPages').then((m) => ({ default: m.AdminTripsPage }))
);
const AdminBookingsPage = lazy(() =>
  import('../pages/admin/AdminPages').then((m) => ({ default: m.AdminBookingsPage }))
);
const AdminPaymentsPage = lazy(() =>
  import('../pages/admin/AdminPages').then((m) => ({ default: m.AdminPaymentsPage }))
);
const AdminFinancePage = lazy(() =>
  import('../pages/admin/AdminPages').then((m) => ({ default: m.AdminFinancePage }))
);
const AdminContentPage = lazy(() =>
  import('../pages/admin/AdminPages').then((m) => ({ default: m.AdminContentPage }))
);
const AdminConfigPage = lazy(() =>
  import('../pages/admin/AdminPages').then((m) => ({ default: m.AdminConfigPage }))
);
const AdminAuditLogsPage = lazy(() =>
  import('../pages/admin/AdminPages').then((m) => ({ default: m.AdminAuditLogsPage }))
);

function RouteLoadingFallback() {
  return (
    <div className="vx-container">
      <div className="vx-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
        Đang tải trang…
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* 1. PUBLIC & BOOKING ROUTES */}
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="xe-khach" element={<BusLandingPage />} />
            <Route path="xe-khach/tim-kiem" element={<BusSearchPage />} />
            <Route path="xe-khach/chuyen/:tripId" element={<BusTripDetailPage />} />
            <Route path="xe-khach/chuyen/:tripId/chon-cho" element={<BusSeatSelectionPage />} />

            <Route path="may-bay" element={<FlightsLandingPage />} />
            <Route path="may-bay/tim-kiem" element={<FlightsSearchPage />} />

            <Route path="tau-hoa" element={<RailwaysLandingPage />} />
            <Route path="tau-hoa/tim-kiem" element={<RailwaysSearchPage />} />

            <Route path="thue-xe" element={<RentalsLandingPage />} />
            <Route path="thue-xe/danh-sach" element={<RentalsListPage />} />
            <Route path="thue-xe/:id" element={<RentalDetailPage />} />

            <Route path="hang-xe" element={<OperatorsListPage />} />
            <Route path="hang-xe/:slug" element={<OperatorDetailPage />} />

            <Route path="diem-den" element={<DestinationsListPage />} />
            <Route path="diem-den/:slug" element={<DestinationDetailPage />} />

            <Route path="tin-tuc" element={<NewsListPage />} />
            <Route path="tin-tuc/:slug" element={<NewsDetailPage />} />

            <Route path="gioi-thieu" element={<AboutPage />} />
            <Route path="lien-he" element={<ContactPage />} />
            <Route path="dieu-khoan" element={<TermsPage />} />
            <Route path="chinh-sach" element={<PolicyPage />} />

            <Route path="dang-nhap" element={<LoginPage />} />
            <Route path="dang-ky" element={<RegisterPage />} />
            <Route path="quen-mat-khau" element={<ForgotPasswordPage />} />

            {/* Booking & Payment Routes */}
            <Route
              path="dat-ve/:bookingId"
              element={
                <ProtectedRoute>
                  <BookingCheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="dat-ve/:bookingId/thanh-toan"
              element={
                <ProtectedRoute>
                  <BookingPaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="thanh-toan/ket-qua"
              element={
                <ProtectedRoute>
                  <PaymentResultPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="ve/:ticketId"
              element={
                <ProtectedRoute>
                  <TicketDetailPage />
                </ProtectedRoute>
              }
            />

            {/* 2. CUSTOMER ACCOUNT NESTED LAYOUT ROUTES */}
            <Route
              path="tai-khoan"
              element={
                <ProtectedRoute>
                  <AccountLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AccountProfilePage />} />
              <Route path="don-hang" element={<AccountOrdersPage />} />
              <Route path="don-hang/:id" element={<AccountOrderDetailPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* 3. PARTNER (OPERATOR) DASHBOARD ROUTES (/doi-tac/*) */}
          <Route
            path="doi-tac"
            element={
              <ProtectedRoute requirePartner>
                <PartnerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PartnerDashboardPage />} />
            <Route path="xe-va-so-do" element={<PartnerVehiclesPage />} />
            <Route path="tuyen-duong" element={<PartnerRoutesPage />} />
            <Route path="chuyen-xe" element={<PartnerTripsPage />} />
            <Route path="gia-ve" element={<PartnerPricingPage />} />
            <Route path="hanh-khach" element={<PartnerPassengersPage />} />
            <Route path="don-dat-ve" element={<PartnerBookingsPage />} />
            <Route path="nhan-vien" element={<PartnerStaffPage />} />
            <Route path="bao-cao" element={<PartnerReportsPage />} />
          </Route>

          {/* 4. PLATFORM ADMIN DASHBOARD ROUTES (/admin/*) */}
          <Route
            path="admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="hang-xe" element={<AdminOperatorsPage />} />
            <Route path="nguoi-dung" element={<AdminUsersPage />} />
            <Route path="chuyen-xe" element={<AdminTripsPage />} />
            <Route path="don-dat-ve" element={<AdminBookingsPage />} />
            <Route path="thanh-toan" element={<AdminPaymentsPage />} />
            <Route path="tai-chinh" element={<AdminFinancePage />} />
            <Route path="noi-dung" element={<AdminContentPage />} />
            <Route path="cau-hinh" element={<AdminConfigPage />} />
            <Route path="nhat-ky" element={<AdminAuditLogsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
