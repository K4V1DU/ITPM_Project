import { Routes, Route } from "react-router-dom";
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
import HostProfile from "./Components/Host_Profile/HostProfile";
import FoodCheckout from "./Components/Food_Checkout/FoodCheckout";
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





function App() {
  return (
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
      <Route path="/Host-Profile" element={<HostProfile />} />
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
      


    </Routes>
  );
}

export default App;
