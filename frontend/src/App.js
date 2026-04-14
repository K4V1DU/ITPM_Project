import { Routes, Route } from "react-router-dom";
import { ToastProvider } from "./Components/Overlays/ToastMessages/ToastContext.jsx";
import "./Components/Overlays/ToastMessages/Toast.css";
import Boardings from "./Components/Boardings/Boardings";
import Hostpage from "./Components/HostPage/HostPage";
import AddAccommodation from "./Components/AddAccommodation/AddAccommodation";
import AccommodationEdit from "./Components/Accommodation_Edit/AccommodationEdit";
import AccommodationDetails from "./Components/AccommodationDetails/AccommodationDetails"
import FoodService from "./Components/FoodServices/FoodService";
import Foods from "./Components/Foods/Foods";
import AddFoodService from "./Components/FoodService_Add/AddFoodService";
import Login from "./Components/Login/Login";
import EditFoodService from "./Components/FoodService_Edit/EditFoodService";
import HostListings from "./Components/Host_Listing/HostListings";
import UserProfile from "./Components/User_Profile/UserProfile";
import FoodCheckout from "./Components/Food_Checkout/FoodCheckout"
import Payment from "./Components/Payment/Payment";
import PaymentReceipt from "./Components/Payment/PaymentReceipt";
import Messages from "./Components/Message/Messages";
import HostOrders from "./Components/Host_Orders/HostOrders";
import HostNavbar from "./Components/NavBar/Host_NavBar/HostNavbar";
import Footer from "./Components/NavBar/Footer/Footer";
import StudentOrders from "./Components/Student_Orders/StudentOrders";
import PaymentHistory from "./Components/Payment_History/HostPayments";
import Register from "./Components/Register/Register";
import ForgotPassword from "./Components/ForgotPassword/ForgotPassword";
import ForgotPasswrodOtp from "./Components/ForgotPasswordOtp/ForgotPasswordOtp";
import ResetPassword from "./Components/ResetPassword/ResetPassword";
import Favourites from "./Components/Favourites/Favourites";
import HostBooking from "./Components/Host_Bookings/HostBooking";
import AdminDashBoard from "./Components/AdminPannel/AdminDashBoard";
import AdminUsers from './Components/AdminPannel/AdminUsers.js';
import AdminListings from "./Components/AdminPannel/AdminListning";
import AdminPayments from "./Components/AdminPannel/AdminPayments";
import AdminReviews from "./Components/AdminPannel/AdminReviews";
import AdminProfile from "./Components/User_Profile/AdminProfile/AdminProfile";
import AdminBookings from "./Components/AdminPannel/AdminBookings.js";
import AdminOrders from "./Components/AdminPannel/AdminOrders.js";
import StudentBookings from "./Components/Student_Bookings/StudentBooking.js";
import LoadingScreen from "./Components/Overlays/LoadingScreen/Loader.jsx";



function App() {
  return (

    <ToastProvider>
    <Routes>
      
      <Route path="/" element={<Login />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Boardings" element={<Boardings />} />
      <Route path="/FoodService/:id" element={<FoodService />} />
      <Route path="/AddFoodService" element={<AddFoodService />} />
      <Route path="/EditFoodService/:id" element={<EditFoodService />} />
      <Route path="/host" element={<Hostpage />} />
      <Route path="/add-accommodation" element={<AddAccommodation />} />
      <Route path="/edit-Accommodation/:id" element={<AccommodationEdit />} />
      <Route path="/details-Accommodation/:id" element={<AccommodationDetails />} />
      <Route path="/Foods" element={<Foods />} />
      <Route path="/Listings" element={<HostListings />} />
      <Route path="/Profile"      element={<UserProfile />} /> 
      <Route path="/Host-Profile" element={<UserProfile />} /> 
      <Route path="/UserProfile" element={<UserProfile />} />
      <Route path="/FoodCheckout/:id" element={<FoodCheckout />} />
      <Route path="/Payment" element={<Payment />} />
      <Route path="/PaymentReceipt" element={<PaymentReceipt />} />
      <Route path="/Messages" element={<Messages />} />
      <Route path="/HostOrders" element={<HostOrders />} />
      <Route path="/HostBookings" element={<HostBooking />} />
      <Route path="/HostNavbar" element={<HostNavbar />} />
      <Route path="/Footer" element={<Footer />} />
      <Route path="/StudentOrders" element={<StudentOrders />} />
      <Route path="/PaymentHistory" element={<PaymentHistory />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/ForgotPassword" element={<ForgotPassword />} />
      <Route path="/ForgotPasswrodOtp" element={<ForgotPasswrodOtp />} />
      <Route path="/ResetPassword" element={<ResetPassword />} />
      <Route path="/Favourites" element={<Favourites />} />
      <Route path="/AdminDashBoard" element={<AdminDashBoard />} />
      <Route path="/AdminUsers" element={<AdminUsers />} />
      <Route path="/AdminListings" element={<AdminListings />} />
      <Route path="/AdminPayments" element={<AdminPayments />} />
      <Route path="/AdminReviews" element={<AdminReviews />} />
      <Route path="/AdminProfile" element={<AdminProfile />} />
      <Route path="/AdminBookings" element={<AdminBookings />} />
      <Route path="/AdminOrders" element={<AdminOrders />} />
      <Route path="/StudentBookings" element={<StudentBookings />} />
      <Route path="/LoadingScreen" element={<LoadingScreen />} />

    </Routes>
    </ToastProvider>
  );
}

export default App;
