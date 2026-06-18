import React from "react";
import { createRoot } from "react-dom/client";
import ClariseApp from "./ClarisePrototype.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClariseApp />
  </React.StrictMode>
);

