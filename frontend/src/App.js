import { Routes, Route } from "react-router-dom";
import Boardings from "./Components/Boardings/Boardings";
import Hostpage from "./Components/HostPage/HostPage";
import AddAccommodation from "./Components/AddAccommodation/AddAccommodation";
import AccommodationEdit from "./Components/Accommodation_Edit/AccommodationEdit";
import FoodService from "./Components/FoodServices/FoodService";








function App() {
  return (
    <Routes>
      <Route path="/" element={<FoodService />} />
      <Route path="/Boardings" element={<Boardings />} />
      <Route path="/FoodService" element={<FoodService />} />
      <Route path="/host" element={<Hostpage />} />
      <Route path="/add-accommodation" element={<AddAccommodation />} />
      <Route path="/edit-Accommodation/:id" element={<AccommodationEdit />} />

      


    </Routes>
  );
}

export default App;
