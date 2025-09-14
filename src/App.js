import React, { useState, useEffect } from "react";
import Login from "./Login";
import Signup from "./Signup";
import Dashboard from "./Dashboard";
import TenantForm from "./TenantForm";
import "./tenant-form.css";


function App() {
  const [view, setView] = useState("login"); // "login", "signup", "dashboard"
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [stores, setStores] = useState([]);

  // Fetch stores after login
  useEffect(() => {
    if (!token) return;

    const fetchStores = async () => {
      try {
        const res = await fetch("http://localhost:3000/stores", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setStores(data);
        setView("dashboard");
      } catch (err) {
        console.error(err);
      }
    };

    fetchStores();
  }, [token]);

  const handleLoginSuccess = (jwt) => {
    setToken(jwt);
    localStorage.setItem("token", jwt);
  };

  const handleLogout = () => {
    setToken(null);
    setView("login");
    localStorage.removeItem("token");
  };

  const handleStoreCreated = (store) => {
    setStores((prev) => [...prev, store]);
  };

  // Render login/signup before dashboard
  if (!token) {
    return view === "login" ? (
      <Login
        onLoginSuccess={handleLoginSuccess}
        switchToSignup={() => setView("signup")}
      />
    ) : (
      <Signup switchToLogin={() => setView("login")} />
    );
  }

  // Dashboard view
  return (
    <div className="h-screen">
      {/* Main Content */}
      <main className="h-full">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <Dashboard token={token} onLogout={handleLogout} />
          </div>
          <div className="flex-shrink-0">
            <TenantForm onTenantCreated={handleStoreCreated} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;