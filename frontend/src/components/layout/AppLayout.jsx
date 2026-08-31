import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-[72px]">{children ?? <Outlet />}</main>
      <Footer />
    </div>
  );
}

export default AppLayout;

