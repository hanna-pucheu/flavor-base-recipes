// src/pages/home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api";
import Loader from "../components/loader";
import ErrorMessage from "../components/errormessage";

const PREVIEW_LIMIT = 5;

function formatNumber(x) {
  if (x === null || x === undefined) return "N/A";
  const num = Number(x);
  if (Number.isNaN(num)) return x.toString();
  return num.toLocaleString();
}

function formatRating(x) {
  if (x === null || x === undefined) return "N/A";
  const num = Number(x);
  if (Number.isNaN(num)) return "N/A";
  return num.toFixed(2);
}

function Home() {
  const [topReviewers, setTopReviewers] = useState([]);
  const [topRecipes, setTopRecipes] = useState([]);
  const [controversialRecipes, setControversialRecipes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHomeData() {
      try {
        setLoading(true);
        setError(null);

        const [reviewers, recipes, controversial] = await Promise.all([
          apiGet("/api/users/top-reviewers"),
          apiGet("/api/recipes/leaderboard"),
          apiGet("/api/recipes/controversial"),
        ]);

        setTopReviewers(reviewers || []);
        setTopRecipes(recipes || []);
        setControversialRecipes(controversial || []);
      } catch (err) {
        console.error("Error loading home data:", err);
        setError(err.message || "Failed to load Flavor Base data.");
      } finally {
        setLoading(false);
      }
    }

    fetchHomeData();
  }, []);

  return (
    <div className="home-page" style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Hero section */}
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.25rem", fontWeight: "700", marginBottom: "0.5rem" }}>
          Flavor Base
        </h1>
        <p style={{ fontSize: "1rem", color: "#555", maxWidth: "32rem" }}>
          Explore 230k+ recipes by time, macros, difficulty, and crowd wisdom. Start
          from what’s popular, what fits your macros, or who you trust.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <Link
            to="/search"
            className="btn-primary"
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#f97316",
              color: "white",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Explore recipes
          </Link>
          <Link
            to="/macros"
            className="btn-secondary"
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "999px",
              border: "1px solid #ddd",
              backgroundColor: "white",
              color: "#111",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Find macro-friendly meals
          </Link>
          <Link
            to="/insights"
            className="btn-ghost"
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "transparent",
              color: "#555",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            View stats & insights
          </Link>
        </div>
      </header>

      {loading && <Loader />}

      {error && !loading && (
        <div style={{ marginBottom: "1.5rem" }}>
          <ErrorMessage message={error} />
        </div>
      )}

      {!loading && !error && (
        <div
          className="home-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {/* Top Recipes section */}
          <section
            style={{
              borderRadius: "0.75rem",
              border: "1px solid #eee",
              padding: "1rem 1.25rem",
              backgroundColor: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem" }}>
              Top Recipes on Flavor Base
            </h2>
            {topRecipes.slice(0, PREVIEW_LIMIT).map((recipe) => (
              <div
                key={recipe.recipe_id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <Link
                  to={`/recipes/${recipe.recipe_id}`}
                  style={{
                    fontWeight: 600,
                    color: "#111",
                    textDecoration: "none",
                    marginBottom: "0.1rem",
                  }}
                >
                  {recipe.name}
                </Link>
                <div style={{ fontSize: "0.9rem", color: "#555" }}>
                  <span>⭐ {formatRating(recipe.avg_rating)}</span>
                  <span> · {formatNumber(recipe.num_ratings)} ratings</span>
                  <span> · {formatNumber(recipe.minutes)} min</span>
                </div>
              </div>
            ))}
            {topRecipes.length > PREVIEW_LIMIT && (
              <p style={{ fontSize: "0.85rem", color: "#777", marginTop: "0.5rem" }}>
                Showing {PREVIEW_LIMIT} of {topRecipes.length} leaderboard results.
              </p>
            )}
          </section>

          {/* Top Reviewers section */}
          <section
            style={{
              borderRadius: "0.75rem",
              border: "1px solid #eee",
              padding: "1rem 1.25rem",
              backgroundColor: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem" }}>
              Top Reviewers
            </h2>
            {topReviewers.slice(0, PREVIEW_LIMIT).map((user) => (
              <div
                key={user.user_id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <Link
                  to={`/users/${user.user_id}`}
                  style={{
                    fontWeight: 600,
                    color: "#111",
                    textDecoration: "none",
                    marginBottom: "0.1rem",
                  }}
                >
                  {user.username}
                </Link>
                <div style={{ fontSize: "0.9rem", color: "#555" }}>
                  <span>{formatNumber(user.review_count)} reviews</span>
                  <span> · {formatNumber(user.unique_recipes_reviewed)} recipes</span>
                  <span> · avg ⭐ {formatRating(user.avg_rating_given)}</span>
                </div>
              </div>
            ))}
            {topReviewers.length > PREVIEW_LIMIT && (
              <p style={{ fontSize: "0.85rem", color: "#777", marginTop: "0.5rem" }}>
                Showing {PREVIEW_LIMIT} of {topReviewers.length} reviewers.
              </p>
            )}
          </section>

          {/* Controversial recipes section */}
          <section
            style={{
              borderRadius: "0.75rem",
              border: "1px solid #eee",
              padding: "1rem 1.25rem",
              backgroundColor: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem" }}>
              Controversial Recipes
            </h2>
            <p style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.5rem" }}>
              High mix of 5★ and 1★ reviews — people{" "}
              <span style={{ fontStyle: "italic" }}>have opinions</span>.
            </p>
            {controversialRecipes.slice(0, PREVIEW_LIMIT).map((recipe) => (
              <div
                key={recipe.recipe_id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <Link
                  to={`/recipes/${recipe.recipe_id}`}
                  style={{
                    fontWeight: 600,
                    color: "#111",
                    textDecoration: "none",
                    marginBottom: "0.1rem",
                  }}
                >
                  {recipe.name}
                </Link>
                <div style={{ fontSize: "0.9rem", color: "#555" }}>
                  <span>{formatNumber(recipe.n_ratings)} ratings</span>
                  <span>
                    {" "}
                    · {Math.round(Number(recipe.pct_5) * 100)}% 5★ /{" "}
                    {Math.round(Number(recipe.pct_1) * 100)}% 1★
                  </span>
                </div>
              </div>
            ))}
            {controversialRecipes.length > PREVIEW_LIMIT && (
              <p style={{ fontSize: "0.85rem", color: "#777", marginTop: "0.5rem" }}>
                Showing {PREVIEW_LIMIT} of {controversialRecipes.length} controversial picks.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default Home;
