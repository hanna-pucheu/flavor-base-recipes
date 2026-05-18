// src/App.jsx
import React from "react";
import { Routes, Route, Link } from "react-router-dom";

import Home from "./pages/home";
import SearchPage from "./pages/search";
import MacroSearchPage from "./pages/macrosearch";
import RecipeDetailsPage from "./pages/recipedetails";
import UserSummaryPage from "./pages/usersummary";
import StatInsightsPage from "./pages/statinsights";

function App() {
  return (
    <div
      className="app-root"
      style={{ minHeight: "100vh", backgroundColor: "#fafafa" }}
    >
      {/* Top navigation */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e5e5",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0.75rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          {/* Brand */}
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.35rem",
              textDecoration: "none",
            }}
          >
            <span
              style={{ fontWeight: 800, fontSize: "1.3rem", color: "#111827" }}
            >
              Flavor
            </span>
            <span
              style={{ fontWeight: 600, fontSize: "1.1rem", color: "#f97316" }}
            >
              Base
            </span>
          </Link>

          {/* Nav links */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.95rem",
            }}
          >
            <Link
              to="/search"
              style={{ textDecoration: "none", color: "#374151", fontWeight: 500 }}
            >
              Search
            </Link>
            <Link
              to="/macros"
              style={{ textDecoration: "none", color: "#374151", fontWeight: 500 }}
            >
              Macro Search
            </Link>
            <Link
              to="/insights"
              style={{ textDecoration: "none", color: "#374151", fontWeight: 500 }}
            >
              Insights
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content area */}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/macros" element={<MacroSearchPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailsPage />} />
          <Route path="/users/:id" element={<UserSummaryPage />} />
          <Route path="/insights" element={<StatInsightsPage />} />

          {/* Fallback route */}
          <Route
            path="*"
            element={
              <div style={{ padding: "1.5rem" }}>
                <h2
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  Page not found
                </h2>
                <p style={{ color: "#555", marginBottom: "0.75rem" }}>
                  The page you&apos;re looking for doesn&apos;t exist.
                </p>
                <Link
                  to="/"
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    borderRadius: "999px",
                    border: "1px solid #ddd",
                    textDecoration: "none",
                    color: "#111",
                    fontSize: "0.9rem",
                  }}
                >
                  Back to Flavor Base home
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
