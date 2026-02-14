import { Routes, Route } from "react-router-dom";
import Boardings from "./Components/Boardings/Boardings";











function App() {
  return (
    <Routes>
      <Route path="/" element={<Boardings />} />
    </Routes>
  );
}

export default App;
