import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';
import CatalogLayout from '../components/routing/CatalogLayout.jsx';
import HomePage from '../pages/HomePage.jsx';
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import BookingsPage from '../pages/customer/BookingsPage.jsx';
import BudgetPage from '../pages/customer/BudgetPage.jsx';
import BookingCenterPage from '../pages/customer/BookingCenterPage.jsx';
import BookingCenterRedirect from '../pages/customer/BookingCenterRedirect.jsx';
import CreateWeddingPage from '../pages/customer/CreateWeddingPage.jsx';
import JoinWeddingPage from '../pages/customer/JoinWeddingPage.jsx';
import EditWeddingPage from '../pages/customer/EditWeddingPage.jsx';
import GuestsPage from '../pages/customer/GuestsPage.jsx';
import InvitationsPage from '../pages/customer/InvitationsPage.jsx';
import MessagesPage from '../pages/customer/MessagesPage.jsx';
import ReportsPage from '../pages/customer/ReportsPage.jsx';
import SettingsPage from '../pages/customer/SettingsPage.jsx';
import TasksPage from '../pages/customer/TasksPage.jsx';
import VendorsPage from '../pages/customer/VendorsPage.jsx';
import VendorDetailsPage from '../pages/customer/VendorDetailsPage.jsx';
import MyWeddingsPage from '../pages/customer/MyWeddingsPage.jsx';
import WeddingCartPage from '../pages/customer/WeddingCartPage.jsx';
import MarketplacePage from '../pages/customer/MarketplacePage.jsx';
import WeddingDetailPage from '../pages/customer/WeddingDetailPage.jsx';
import ServicesPage from '../pages/customer/ServicesPage.jsx';
import ServiceDetailsPage from '../pages/customer/ServiceDetailsPage.jsx';
import SelectionsPage from '../pages/customer/SelectionsPage.jsx';
import PaymentsPage from '../pages/customer/PaymentsPage.jsx';
import VenuesPage from '../pages/customer/VenuesPage.jsx';
import VenueDetailPage from '../pages/customer/VenueDetailPage.jsx';
import WorkspaceListingDetailPage from '../pages/customer/WorkspaceListingDetailPage.jsx';
import WeddingWorkspacePage from '../pages/customer/WeddingWorkspacePage.jsx';
import HallsPage from '../pages/public/HallsPage.jsx';
import HallDetailPage from '../pages/public/HallDetailPage.jsx';
import AboutPage from '../pages/public/AboutPage.jsx';
import ContactPage from '../pages/public/ContactPage.jsx';
import TimelinePage from '../pages/customer/TimelinePage.jsx';
import VendorPaymentsPage from '../pages/vendor/VendorPaymentsPage.jsx';
import VendorReportsPage from '../pages/vendor/VendorReportsPage.jsx';
import PlannerReportsPage from '../pages/planner/PlannerReportsPage.jsx';
import AdminWeddingDetailPage from '../pages/admin/AdminWeddingDetailPage.jsx';
import AdminCreateWeddingPage from '../pages/admin/AdminCreateWeddingPage.jsx';
import VendorTasksPage from '../pages/vendor/VendorTasksPage.jsx';
import VendorAvailabilityPage from '../pages/vendor/VendorAvailabilityPage.jsx';
import PublicInvitationPage from '../pages/PublicInvitationPage.jsx';
import AdminDashboard from '../pages/dashboard/AdminDashboard.jsx';
import CustomerDashboard from '../pages/dashboard/CustomerDashboard.jsx';
import PlannerDashboard from '../pages/dashboard/PlannerDashboard.jsx';
import VendorDashboard from '../pages/dashboard/VendorDashboard.jsx';
import RoleLayout from '../components/role/RoleLayout.jsx';
import AdminAddUserPage from '../pages/admin/AdminAddUserPage.jsx';
import AdminManageUsersPage from '../pages/admin/AdminManageUsersPage.jsx';
import AdminWeddingsPage from '../pages/admin/AdminWeddingsPage.jsx';
import AdminCustomersPage from '../pages/admin/AdminCustomersPage.jsx';
import AdminCustomerDetailPage from '../pages/admin/AdminCustomerDetailPage.jsx';
import AdminPlannersPage from '../pages/admin/AdminPlannersPage.jsx';
import AdminPlannerDetailPage from '../pages/admin/AdminPlannerDetailPage.jsx';
import AdminVendorsPage from '../pages/admin/AdminVendorsPage.jsx';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage.jsx';
import AdminPaymentsPage from '../pages/admin/AdminPaymentsPage.jsx';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage.jsx';
import AdminServicesPage from '../pages/admin/AdminServicesPage.jsx';
import AdminSendNotificationPage from '../pages/admin/AdminSendNotificationPage.jsx';
import AdminManageNotificationsPage from '../pages/admin/AdminManageNotificationsPage.jsx';
import AdminAnnouncementsPage from '../pages/admin/AdminAnnouncementsPage.jsx';
import AdminReportsPage from '../pages/admin/AdminReportsPage.jsx';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage.jsx';
import AdminMessagesPage from '../pages/admin/AdminMessagesPage.jsx';
import AdminVenuesPage from '../pages/admin/AdminVenuesPage.jsx';
import AdminVenueDetailPage from '../pages/admin/AdminVenueDetailPage.jsx';
import VendorListingsPage from '../pages/vendor/VendorListingsPage.jsx';
import VendorBookingsPage from '../pages/vendor/VendorBookingsPage.jsx';
import VendorOrdersPage from '../pages/vendor/VendorOrdersPage.jsx';
import VendorProfilePage from '../pages/vendor/VendorProfilePage.jsx';
import MyProfilePage from '../pages/account/MyProfilePage.jsx';
import PlannerWeddingPage from '../pages/planner/PlannerWeddingPage.jsx';
import HallQuotesPage from '../pages/hall/HallQuotesPage.jsx';
import RoleRoute from './RoleRoute.jsx';
import CoupleRoute from './CoupleRoute.jsx';
import PlannerRoute from './PlannerRoute.jsx';
import SmartNotFound from './SmartNotFound.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="invite/:token" element={<PublicInvitationPage />} />
      </Route>

      <Route element={<CatalogLayout />}>
        <Route path="venues" element={<VenuesPage />} />
        <Route path="venues/:id" element={<VenueDetailPage />} />
        <Route path="halls" element={<HallsPage />} />
        <Route path="halls/:id" element={<HallDetailPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:id" element={<ServiceDetailsPage />} />
      </Route>

      <Route element={<RoleRoute role="vendor" />}>
        <Route element={<RoleLayout role="vendor" />}>
          <Route path="vendor/dashboard" element={<VendorDashboard />} />
          <Route path="vendor/profile" element={<VendorProfilePage />} />
          <Route path="vendor/listings" element={<VendorListingsPage />} />
          <Route path="vendor/availability" element={<VendorAvailabilityPage />} />
          <Route path="vendor/orders" element={<VendorOrdersPage />} />
          <Route path="vendor/tasks" element={<VendorTasksPage />} />
          <Route path="vendor/bookings" element={<VendorBookingsPage />} />
          <Route path="vendor/quotes" element={<HallQuotesPage mode="vendor" />} />
          <Route path="vendor/payments" element={<VendorPaymentsPage />} />
          <Route path="vendor/messages" element={<MessagesPage />} />
          <Route path="vendor/reports" element={<VendorReportsPage />} />
          <Route path="vendor/account" element={<MyProfilePage />} />
          <Route path="vendor/settings" element={<Navigate to="/vendor/account" replace />} />
        </Route>
      </Route>

      <Route element={<PlannerRoute />}>
        <Route element={<RoleLayout role="planner" />}>
          <Route path="planner/dashboard" element={<PlannerDashboard />} />
          <Route path="planner/weddings" element={<PlannerDashboard />} />
          <Route path="planner/weddings/:id" element={<PlannerWeddingPage />} />
          <Route path="planner/messages" element={<MessagesPage />} />
          <Route path="planner/reports" element={<PlannerReportsPage />} />
          <Route path="planner/profile" element={<MyProfilePage />} />
          <Route path="planner/settings" element={<Navigate to="/planner/profile" replace />} />
        </Route>
      </Route>

      <Route element={<RoleRoute role="admin" />}>
        <Route element={<RoleLayout role="admin" />}>
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/users" element={<Navigate to="/admin/users/manage" replace />} />
          <Route path="admin/users/add" element={<AdminAddUserPage />} />
          <Route path="admin/users/manage" element={<AdminManageUsersPage />} />
          <Route path="admin/customers" element={<AdminCustomersPage />} />
          <Route path="admin/customers/:id" element={<AdminCustomerDetailPage />} />
          <Route path="admin/planners" element={<AdminPlannersPage />} />
          <Route path="admin/planners/:id" element={<AdminPlannerDetailPage />} />
          <Route path="admin/vendors" element={<AdminVendorsPage />} />
          <Route path="admin/weddings" element={<AdminWeddingsPage />} />
          <Route path="admin/weddings/new" element={<AdminCreateWeddingPage />} />
          <Route path="admin/weddings/:id" element={<AdminWeddingDetailPage />} />
          <Route path="admin/venues" element={<AdminVenuesPage />} />
          <Route path="admin/venues/:id" element={<AdminVenueDetailPage />} />
          <Route path="admin/services" element={<AdminServicesPage />} />
          <Route path="admin/bookings" element={<AdminBookingsPage />} />
          <Route path="admin/quotes" element={<HallQuotesPage mode="admin" />} />
          <Route path="admin/orders" element={<AdminOrdersPage />} />
          <Route path="admin/payments" element={<AdminPaymentsPage />} />
          <Route path="admin/notifications/send" element={<AdminSendNotificationPage />} />
          <Route path="admin/notifications/announcements" element={<AdminAnnouncementsPage />} />
          <Route path="admin/notifications" element={<AdminManageNotificationsPage />} />
          <Route path="admin/reports/finance" element={<AdminReportsPage />} />
          <Route path="admin/reports/operations" element={<AdminReportsPage />} />
          <Route path="admin/reports" element={<AdminReportsPage />} />
          <Route path="admin/messages" element={<AdminMessagesPage />} />
          <Route path="admin/profile" element={<MyProfilePage />} />
          <Route path="admin/settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      <Route element={<CoupleRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="workspace" element={<WeddingWorkspacePage />} />
          <Route path="weddings" element={<MyWeddingsPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="wedding-cart" element={<WeddingCartPage />} />
          <Route path="weddings/join" element={<JoinWeddingPage />} />
          <Route path="bookings/center" element={<BookingCenterRedirect />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="quotes" element={<HallQuotesPage mode="customer" />} />
          <Route path="weddings/new" element={<CreateWeddingPage />} />
          <Route path="weddings/:weddingId/bookings" element={<BookingCenterPage />} />
          <Route path="weddings/:weddingId/bookings/listings/:id" element={<WorkspaceListingDetailPage />} />
          <Route path="weddings/:id/edit" element={<EditWeddingPage />} />
          <Route path="weddings/:id" element={<WeddingDetailPage />} />
          <Route path="wedding/create" element={<Navigate to="/weddings/new" replace />} />
          <Route path="wedding/edit" element={<EditWeddingPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="vendors/:id" element={<VendorDetailsPage />} />
          <Route path="selections" element={<SelectionsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="guests" element={<GuestsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="invitations" element={<InvitationsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<MyProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<SmartNotFound />} />
    </Routes>
  );
}

export default AppRoutes;
