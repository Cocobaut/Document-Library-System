/*
 * Application Entry Point
 *
 * Bootstraps the React application by mounting the root App component
 * into the DOM element with id "root" defined in index.html.
 */
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);