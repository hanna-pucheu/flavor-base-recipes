// src/pages/usersummary.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiGet } from "../api";
import Loader from "../components/loader";
import ErrorMessage from "../components/errormessage";

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatRating(value) {
  const n = asNumber(value);
  if (n === null) return "—";
  return n.toFixed(2);
}

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString();
}

function Usersummary() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    async function fetchUser() {
      setLoading(true);
      setError(null);
      try {
        const [summaryData, reviewData] = await Promise.all([
          apiGet(`/api/users/${id}/summary`),
          apiGet(`/api/users/${id}/reviews`, { limit: 20 }),
        ]);

        setSummary(summaryData || null);
        setReviews(reviewData || []);
      } catch (err) {
        console.error("Error loading user summary:", err);
        setError(err.message || "Failed to load user summary");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [id]);

  const username = summary?.username ?? `user_${summary?.user_id ?? id}`;
  const avgRating = formatRating(summary?.avg_rating);
  const totalReviewsNum = asNumber(summary?.n_reviews);
  const totalReviewsLabel =
    totalReviewsNum === null ? summary?.n_reviews ?? "—" : totalReviewsNum;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1.5rem" }}>
      {loading && <Loader />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && summary && (
        <>
          {/* Header / summary card */}
          <header style={{ marginBottom: "1.5rem" }}>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                marginBottom: "0.25rem",
                color: "#111827",
              }}
            >
              Reviewer Profile
            </h1>
            <p style={{ color: "#4b5563", fontSize: "0.95rem" }}>
              Stats and recent activity for{" "}
              <span style={{ fontWeight: 600 }}>{username}</span>.
            </p>
          </header>

          <section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: "1rem 1.25rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              border: "1px solid #e5e7eb",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1.5rem",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    marginBottom: "0.3rem",
                    color: "#111827",
                  }}
                >
                  {username}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  User ID: {summary.user_id}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1rem",
                  fontSize: "0.9rem",
                }}
              >
                <div
                  style={{
                    minWidth: "120px",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "0.75rem",
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Avg rating
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                    ⭐ {avgRating}
                  </div>
                </div>

                <div
                  style={{
                    minWidth: "120px",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "0.75rem",
                    backgroundColor: "#ecfdf5",
                    color: "#166534",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Total reviews
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                    {totalReviewsLabel}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Recent reviews */}
          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "0.5rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                Recent Reviews
              </h2>
              <span
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#6b7280",
                }}
              >
                /api/users/{id}/reviews
              </span>
            </div>

            {reviews.length === 0 ? (
              <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                No reviews found for this user.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {reviews.map((rev) => (
                  <article
                    key={`${rev.recipe_id}-${rev.date}-${rev.rating}-${Math.random()}`}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "0.75rem",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: "0.75rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <Link
                          to={`/recipes/${rev.recipe_id}`}
                          style={{
                            fontWeight: 500,
                            fontSize: "0.98rem",
                            color: "#111827",
                            textDecoration: "none",
                          }}
                        >
                          {rev.name}
                        </Link>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#6b7280",
                            marginTop: "0.1rem",
                          }}
                        >
                          {formatDate(rev.date)}
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
                          backgroundColor: "#eff6ff",
                          color: "#1d4ed8",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ⭐ {rev.rating}
                      </div>
                    </div>

                    {rev.review && (
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "#4b5563",
                          marginTop: "0.3rem",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {rev.review}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {!loading && !error && !summary && (
        <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
          No summary information found for this user.
        </p>
      )}
    </div>
  );
}

export default Usersummary;
