// src/pages/statinsights.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api";
import Loader from "../components/loader";
import ErrorMessage from "../components/errormessage";

const TOP_LIMIT = 10;
const CONTROVERSIAL_LIMIT = 10;

function formatRating(x) {
  if (x === null || x === undefined) return "—";
  const num = Number(x);
  if (Number.isNaN(num)) return "—";
  return num.toFixed(2);
}

function formatPercent(x) {
  if (x === null || x === undefined) return "—";
  const num = Number(x);
  if (Number.isNaN(num)) return "—";
  return `${(num * 100).toFixed(0)}%`;
}

function StatInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [topRecipes, setTopRecipes] = useState([]);
  const [topReviewers, setTopReviewers] = useState([]);
  const [controversial, setControversial] = useState([]);

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      setError(null);
      try {
        const [recipes, reviewers, controversialRecipes] = await Promise.all([
          apiGet("/api/recipes/leaderboard", { limit: TOP_LIMIT }),
          apiGet("/api/users/top-reviewers", { limit: TOP_LIMIT }),
          apiGet("/api/recipes/controversial", { limit: CONTROVERSIAL_LIMIT }),
        ]);

        setTopRecipes(recipes || []);
        setTopReviewers(reviewers || []);
        setControversial(controversialRecipes || []);
      } catch (err) {
        console.error("Error loading insights:", err);
        setError(err.message || "Failed to load insights");
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, []);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
            color: "#111827",
          }}
        >
          Flavor Base Insights
        </h1>
        <p style={{ color: "#4b5563", maxWidth: "640px", fontSize: "0.95rem" }}>
          High-level stats across the Flavor Base dataset: standout recipes, power
          reviewers, and the most polarizing dishes in the collection.
        </p>
      </header>

      {loading && <Loader />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Top cards section */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {/* Top Recipes */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                padding: "1rem 1.25rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "0.75rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  Top Recipes
                </h2>
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#6b7280",
                  }}
                >
                  /api/recipes/leaderboard
                </span>
              </div>

              {topRecipes.length === 0 ? (
                <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                  No leaderboard data available.
                </p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {topRecipes.map((r) => (
                    <li
                      key={r.recipe_id ?? r.name}
                      style={{
                        padding: "0.4rem 0",
                        borderBottom: "1px solid #f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <Link
                          to={`/recipes/${r.recipe_id}`}
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 500,
                            color: "#111827",
                            textDecoration: "none",
                          }}
                        >
                          {r.name}
                        </Link>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#6b7280",
                            marginTop: "0.1rem",
                          }}
                        >
                          {r.minutes} min · {r.num_ratings} ratings
                        </div>
                      </div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0.15rem 0.55rem",
                          borderRadius: "999px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ⭐ {formatRating(r.avg_rating)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Top Reviewers */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                padding: "1rem 1.25rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "0.75rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  Top Reviewers
                </h2>
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#6b7280",
                  }}
                >
                  /api/users/top-reviewers
                </span>
              </div>

              {topReviewers.length === 0 ? (
                <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                  No reviewer data available.
                </p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {topReviewers.map((u) => (
                    <li
                      key={u.user_id}
                      style={{
                        padding: "0.4rem 0",
                        borderBottom: "1px solid #f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <Link
                          to={`/users/${u.user_id}`}
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 500,
                            color: "#111827",
                            textDecoration: "none",
                          }}
                        >
                          {u.username}
                        </Link>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#6b7280",
                            marginTop: "0.1rem",
                          }}
                        >
                          {u.review_count} reviews ·{" "}
                          {u.unique_recipes_reviewed} recipes
                        </div>
                      </div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0.15rem 0.55rem",
                          borderRadius: "999px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          backgroundColor: "#ecfdf5",
                          color: "#166534",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Avg ⭐ {formatRating(u.avg_rating_given)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Controversial recipes table */}
          <section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: "1rem 1.25rem 1.25rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "0.75rem",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: "0.15rem",
                  }}
                >
                  Most Controversial Recipes
                </h2>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    maxWidth: "580px",
                  }}
                >
                  Recipes with a high share of both 5★ and 1★ ratings. These are
                  the dishes people passionately love or hate.
                </p>
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                }}
              >
                /api/recipes/controversial
              </span>
            </div>

            {controversial.length === 0 ? (
              <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                No controversial recipes found (threshold filters may be strict).
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.88rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        borderBottom: "1px solid #e5e7eb",
                        backgroundColor: "#f9fafb",
                      }}
                    >
                      <th style={{ padding: "0.5rem" }}>Recipe</th>
                      <th style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>
                        Ratings
                      </th>
                      <th style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>
                        5★ Share
                      </th>
                      <th style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>
                        1★ Share
                      </th>
                      <th style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>
                        Polarization
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {controversial.map((row) => {
                      const pct5 = Number(row.pct_5 ?? 0);
                      const pct1 = Number(row.pct_1 ?? 0);
                      const polarization = pct5 + pct1;

                      return (
                        <tr
                          key={row.recipe_id}
                          style={{ borderBottom: "1px solid #f3f4f6" }}
                        >
                          <td style={{ padding: "0.5rem" }}>
                            <Link
                              to={`/recipes/${row.recipe_id}`}
                              style={{
                                color: "#111827",
                                textDecoration: "none",
                                fontWeight: 500,
                              }}
                            >
                              {row.name}
                            </Link>
                          </td>
                          <td style={{ padding: "0.5rem" }}>
                            {row.n_ratings} ratings
                          </td>
                          <td style={{ padding: "0.5rem" }}>
                            {formatPercent(row.pct_5)}
                          </td>
                          <td style={{ padding: "0.5rem" }}>
                            {formatPercent(row.pct_1)}
                          </td>
                          <td style={{ padding: "0.5rem" }}>
                            {formatPercent(polarization)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default StatInsightsPage;
