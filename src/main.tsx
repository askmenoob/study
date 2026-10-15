import "./styles.css";
import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import App from "./App";
import "./components/SecondaryTheme.css";
import "./components/AcademyDesignSystem.css";

createRoot(document.getElementById("root")!).render(<StrictMode><App/></StrictMode>);
