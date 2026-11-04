import React, { lazy, Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
const HouseApp = lazy(() => import("./HouseApp"));
function Explorer() {
  const [house, setHouse] = useState(window.location.hash !== "#senate");
  useEffect(() => {
    const update = () => setHouse(window.location.hash !== "#senate");
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    document.title = house
      ? "Who will control the House? · Metropolis Lab"
      : "Who will control the Senate? · Metropolis Lab";
  }, [house]);
  return (
    <Suspense
      fallback={<p className="route-loading">Loading the district map…</p>}
    >
      {house ? <HouseApp /> : <App />}
    </Suspense>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Explorer />
  </React.StrictMode>,
);
