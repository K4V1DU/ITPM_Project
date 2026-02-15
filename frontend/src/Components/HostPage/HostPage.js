import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HostPage.css";

const HostPage = () => {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const handleNext = () => {
    if (selected === "home") {
      navigate("/add-accommodation");
    }
    // passe experience / food ekata passe add karanna puluwan
  };

  return (
    <div className="host-container">
      <h1 className="host-title">What would you like to host?</h1>

      <div className="card-container">
        <div
          className={`host-card ${selected === "home" ? "active" : ""}`}
          onClick={() => setSelected("home")}
        >
          <div className="emoji">🏠</div>
          <h3>Accommodation</h3>
        </div>

        <div
          className={`host-card ${selected === "experience" ? "active" : ""}`}
          onClick={() => setSelected("experience")}
        >
          <div className="emoji">🎈</div>
          <h3>Experience</h3>
        </div>

        <div
          className={`host-card ${selected === "service" ? "active" : ""}`}
          onClick={() => setSelected("service")}
        >
          <div className="emoji">🛎️</div>
          <h3>Food</h3>
        </div>
      </div>

      <button
        className="next-btn"
        disabled={!selected}
        onClick={handleNext}
      >
        Next
      </button>
    </div>
  );
};

export default HostPage;

// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { FaHome, FaUtensils } from "react-icons/fa";
// import { MdOutlineTravelExplore } from "react-icons/md";
// import "./HostPage.css";

// const HostPage = () => {
//   const [selected, setSelected] = useState(null);
//   const navigate = useNavigate();

//   const handleNext = () => {
//     if (selected === "home") {
//       navigate("/add-accommodation");
//     }
//   };

//   return (
//     <div className="host-container">
//       <h1 className="host-title">What would you like to host?</h1>

//       <div className="card-container">
//         <div
//           className={`host-card ${selected === "home" ? "active" : ""}`}
//           onClick={() => setSelected("home")}
//         >
//           <FaHome className="card-icon" />
//           <h3>Accommodation</h3>
//         </div>

//         <div
//           className={`host-card ${selected === "experience" ? "active" : ""}`}
//           onClick={() => setSelected("experience")}
//         >
//           <MdOutlineTravelExplore className="card-icon" />
//           <h3>Experience</h3>
//         </div>

//         <div
//           className={`host-card ${selected === "service" ? "active" : ""}`}
//           onClick={() => setSelected("service")}
//         >
//           <FaUtensils className="card-icon" />
//           <h3>Food</h3>
//         </div>
//       </div>

//       <button
//         className="next-btn"
//         disabled={!selected}
//         onClick={handleNext}
//       >
//         Next
//       </button>
//     </div>
//   );
// };

// export default HostPage;

