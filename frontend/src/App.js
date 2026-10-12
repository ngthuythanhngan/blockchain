import { useEffect } from "react";                                          // 1. thêm useEffect
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"; // 2. thêm useLocation

import Login from "./Login";
import ForgotPassword from "./Forgotpassword";
import OTPForm from "./OTPForm";
import Resetpassword from "./Resetpassword";
import Home from "./Home";
import Product from "./Product";
import Cart from "./Cart";
import Payment from "./Payment";
import Information from "./Information";
import InformationProduct from "./Informationproduct";
import PaymentSuccess from "./PaymentSuccess";
import Admin from "./Admin";
import AdminProduct from "./AdminProduct";
import Customer from "./Customer";
import Orders from "./Orders";
import Add from "./Add";
import Orderdetails from "./Orderdetails";
import Sale from "./Sale";
import AdminSales from "./AdminSales";
import AdminLogin from "./AdminLogin";
import AdminAccount from "./AdminAccount";
import AdminCategories from "./AdminCategories";
import AdminBlog from "./AdminBlog";
import AdminBanner from "./AdminBanner";
import AdminNotifications from "./AdminNotifications";
import Blog from "./Blog";
import BlogDetail from "./BlogDetail";

// 3. Component scroll về đầu trang mỗi khi đổi route
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function AdminRoute({ children }) {
  try {
    const admin = JSON.parse(sessionStorage.getItem("admin") || "null");
    if (!admin) return <Navigate to="/admin" replace />;
    return children;
  } catch {
    return <Navigate to="/admin" replace />;
  }
}

function UserRoute({ children }) {
  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "null");
    if (!user) return <Navigate to="/login" replace />;
    return children;
  } catch {
    return <Navigate to="/login" replace />;
  }
}

function App() {
  return (
    <Router>
      <ScrollToTop />  {/* ← đặt ngay đây, bên trong Router */}
      <Routes>
        {/* ── USER ── */}
        <Route path="/"                                         element={<Home />} />
        <Route path="/login"                                    element={<Login />} />
        <Route path="/login/forgot_password"                    element={<ForgotPassword />} />
        <Route path="/login/forgot_password/otp"                element={<OTPForm />} />
        <Route path="/login/forgot_password/otp/reset_password" element={<Resetpassword />} />
        <Route path="/product"                                  element={<Product />} />
        <Route path="/product/:id"                              element={<InformationProduct />} />
        <Route path="/sale"                                     element={<Sale />} />
        <Route path="/blog"                                     element={<Blog />} />
        <Route path="/blog/:id"                                 element={<BlogDetail />} />
        <Route path="/cart"           element={<UserRoute><Cart /></UserRoute>} />
        <Route path="/payment"        element={<UserRoute><Payment /></UserRoute>} />
        <Route path="/information"    element={<UserRoute><Information /></UserRoute>} />
        <Route path="/paymentsuccess" element={<UserRoute><PaymentSuccess /></UserRoute>} />

        {/* ── ADMIN ── */}
        <Route path="/admin"                  element={<AdminLogin />} />
        <Route path="/admin/dashboard"        element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/admin/adminproduct"     element={<AdminRoute><AdminProduct /></AdminRoute>} />
        <Route path="/admin/adminproduct/add" element={<AdminRoute><Add /></AdminRoute>} />
        <Route path="/admin/customer"         element={<AdminRoute><Customer /></AdminRoute>} />
        <Route path="/admin/orders"           element={<AdminRoute><Orders /></AdminRoute>} />
        <Route path="/admin/orders/:id"       element={<AdminRoute><Orderdetails /></AdminRoute>} />
        <Route path="/admin/sales"            element={<AdminRoute><AdminSales /></AdminRoute>} />
        <Route path="/admin/account"          element={<AdminRoute><AdminAccount /></AdminRoute>} />
        <Route path="/admin/categories"       element={<AdminRoute><AdminCategories /></AdminRoute>} />
        <Route path="/admin/blog"             element={<AdminRoute><AdminBlog /></AdminRoute>} />
        <Route path="/admin/banner"           element={<AdminRoute><AdminBanner /></AdminRoute>} />
        <Route path="/admin/notifications"    element={<AdminRoute><AdminNotifications /></AdminRoute>} />
      </Routes>
    </Router>
  );
}

export default App;