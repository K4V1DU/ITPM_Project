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








function App() {
  return (
    <Routes>
      <Route path="/" element={<Boardings />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Boardings" element={<Boardings />} />
      <Route path="/FoodService/:id" element={<FoodService />} />
      <Route path="/AddFoodService" element={<AddFoodService />} />
      <Route path="/host" element={<Hostpage />} />
      <Route path="/add-accommodation" element={<AddAccommodation />} />
      <Route path="/edit-Accommodation/:id" element={<AccommodationEdit />} />
      <Route path="/details-Accommodation/:id" element={<AccommodationDetails />} />
      <Route path="/Foods" element={<Foods />} />


    </Routes>
  );
}

export default App;
