import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { StudentAuthProvider } from "./context/StudentAuthContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StudentAuthProvider>
          <App />
        </StudentAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
