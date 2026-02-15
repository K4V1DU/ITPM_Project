import { Routes, Route } from "react-router-dom";
import Boardings from "./Components/Boardings/Boardings";
import Hostpage from "./Components/HostPage/HostPage";
import AddAccommodation from "./Components/AddAccommodation/AddAccommodation";
import AccommodationCustom from "./Components/AccommodationCustom/AccommodationCustom";









function App() {
  return (
    <Routes>
      <Route path="/" element={<Boardings />} />
      <Route path="/host" element={<Hostpage />} />
      <Route path="/add-accommodation" element={<AddAccommodation />} />
      <Route path="/cust" element={<AccommodationCustom />} />

      


    </Routes>
  );
}

export default App;
