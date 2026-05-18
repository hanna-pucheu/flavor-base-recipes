// src/pages/recipedetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiGet } from "../api";
import Loader from "../components/loader";
import ErrorMessage from "../components/errormessage";

const REVIEWS_PAGE_SIZE = 5;

function formatNumber(x) {
  if (x === null || x === undefined) return "N/A";
  const num = Number(x);
  if (Number.isNaN(num)) return "N/A";
  return num.toString();
}

function formatRating(x) {
  if (x === null || x === undefined) return "N/A";
  const num = Number(x);
  if (Number.isNaN(num)) return "N/A";
  return num.toFixed(2);
}

function formatDate(iso) {
  if (!iso) return "Unknown date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function DifficultyBadge({ difficulty }) {
  if (!difficulty) return null;
  const colorMap = {
    Easy: "#22c55e",
    Medium: "#f97316",
    Hard: "#ef4444",
  };
  const bgMap = {
    Easy: "rgba(34,197,94,0.08)",
    Medium: "rgba(249,115,22,0.08)",
    Hard: "rgba(239,68,68,0.08)",
  };
  const color = colorMap[difficulty] || "#6b7280";
  const bg = bgMap[difficulty] || "rgba(148,163,184,0.12)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.15rem 0.6rem",
        borderRadius: "999px",
        fontSize: "0.8rem",
        fontWeight: 600,
        backgroundColor: bg,
        color,
      }}
    >
      {difficulty}
    </span>
  );
}

function RatingHistogram({ recipe }) {
  const counts = {
    5: Number(recipe?.five_star_count || 0),
    4: Number(recipe?.four_star_count || 0),
    3: Number(recipe?.three_star_count || 0),
    2: Number(recipe?.two_star_count || 0),
    1: Number(recipe?.one_star_count || 0),
  };

  const maxCount = Math.max(...Object.values(counts));
  const total =
    Number(recipe?.total_ratings || 0) ||
    Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        padding: "0.9rem 1rem",
        boxShadow: "0 4px 10px rgba(15,23,42,0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.4rem",
          alignItems: "center",
        }}
      >
        <h3
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          Rating breakdown
        </h3>
        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
          {formatRating(recipe?.avg_rating)} / 5 •{" "}
          {formatNumber(total)} ratings
        </div>
      </div>

      {maxCount === 0 ? (
        <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
          No detailed rating distribution available yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = counts[star];
            const width = maxCount ? (count / maxCount) * 100 : 0;
            return (
              <div
                key={star}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span
                  style={{
                    width: "1.5rem",
                    fontSize: "0.8rem",
                    color: "#4b5563",
                  }}
                >
                  {star}★
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "0.5rem",
                    borderRadius: "999px",
                    backgroundColor: "#f3f4f6",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${width}%`,
                      height: "100%",
                      borderRadius: "999px",
                      backgroundColor: "#f97316",
                      transition: "width 0.25s ease-out",
                    }}
                  />
                </div>
                <span
                  style={{
                    width: "2.5rem",
                    textAlign: "right",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Recipedetails() {
  const { id } = useParams();

  // Main data
  const [recipe, setRecipe] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [loadingMain, setLoadingMain] = useState(true);
  const [mainError, setMainError] = useState(null);

  // Secondary data
  const [similarByTags, setSimilarByTags] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsOffset, setReviewsOffset] = useState(0);
  const [reviewsHasMore, setReviewsHasMore] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function fetchMain() {
      setLoadingMain(true);
      setMainError(null);

      try {
        const [detailsData, difficultyData] = await Promise.all([
          apiGet(`/api/recipes/${id}/details`),
          apiGet(`/api/recipes/${id}/difficulty`),
        ]);
        if (cancelled) return;
        setRecipe(detailsData);
        setDifficulty(difficultyData?.difficulty || difficultyData?.difficulty_level);
      } catch (err) {
        if (cancelled) return;
        setMainError(err);
      } finally {
        if (!cancelled) setLoadingMain(false);
      }
    }

    fetchMain();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function fetchSimilarAndRecs() {
      setLoadingSimilar(true);
      setLoadingRecs(true);

      try {
        const [similarData, recData] = await Promise.all([
          apiGet(`/api/recipes/${id}/similar-by-tags`, { limit: 8 }),
          apiGet(`/api/recipes/${id}/recommendations`, { limit: 8 }),
        ]);
        if (cancelled) return;
        setSimilarByTags(Array.isArray(similarData) ? similarData : []);
        setRecommendations(Array.isArray(recData) ? recData : []);
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading similar/recommendations:", err);
      } finally {
        if (!cancelled) {
          setLoadingSimilar(false);
          setLoadingRecs(false);
        }
      }
    }

    fetchSimilarAndRecs();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Fetch reviews (with pagination)
  const fetchReviews = async (reset = false) => {
    if (!id) return;
    try {
      setReviewsLoading(true);
      setReviewsError(null);

      const effectiveOffset = reset ? 0 : reviewsOffset;

      const data = await apiGet(`/api/recipes/${id}/reviews`, {
        limit: REVIEWS_PAGE_SIZE,
        offset: effectiveOffset,
      });

      const list = Array.isArray(data) ? data : [];

      if (reset) {
        setReviews(list);
      } else {
        setReviews((prev) => [...prev, ...list]);
      }

      setReviewsOffset(effectiveOffset + list.length);
      setReviewsHasMore(list.length === REVIEWS_PAGE_SIZE);
    } catch (err) {
      console.error("Error loading reviews:", err);
      setReviewsError(err.message || "Failed to load reviews.");
    } finally {
      setReviewsLoading(false);
    }
  };

  // Load first page of reviews when recipe changes
  useEffect(() => {
    setReviews([]);
    setReviewsOffset(0);
    setReviewsHasMore(true);
    fetchReviews(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loadingMain) {
    return (
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "1.5rem",
        }}
      >
        <Loader />
      </div>
    );
  }

  if (mainError || !recipe) {
    return (
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "1.5rem",
        }}
      >
        <ErrorMessage
          message={
            mainError?.message || "Failed to load this recipe. Please try again."
          }
        />
      </div>
    );
  }

  const totalRatings = Number(recipe.total_ratings || 0);
  const contributorId =
    recipe.contributor_id || recipe.user_id || recipe.submitter_id || null;
  const contributorName =
    recipe.contributor_name || recipe.submitter || recipe.author || null;

  const ingredients = (recipe.ingredients || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const steps = (recipe.steps || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "1.5rem 1.5rem 3rem",
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: "1.25rem" }}>
        <h1
          style={{
            fontSize: "2rem",
            lineHeight: 1.1,
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          {recipe.name}
        </h1>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.6rem 1rem",
            alignItems: "center",
            fontSize: "0.85rem",
            color: "#4b5563",
            marginBottom: "0.4rem",
          }}
        >
          <DifficultyBadge difficulty={recipe.difficulty || difficulty} />

          <span>⏱ {formatNumber(recipe.minutes)} minutes</span>
          <span>📋 {formatNumber(recipe.n_steps)} steps</span>
          <span>📅 Submitted: {formatDate(recipe.submitted_date)}</span>

          <span>
            ⭐ {formatRating(recipe.avg_rating)} / 5{" "}
            {totalRatings ? `(${formatNumber(totalRatings)} ratings)` : ""}
          </span>

          {contributorName && (
            <span>
              by{" "}
              {contributorId ? (
                <Link
                  to={`/users/${contributorId}`}
                  style={{
                    color: "#2563eb",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  {contributorName}
                </Link>
              ) : (
                contributorName
              )}
            </span>
          )}
        </div>

        {recipe.description && (
          <p
            style={{
              marginTop: "0.35rem",
              fontSize: "0.95rem",
              color: "#374151",
              maxWidth: "50rem",
            }}
          >
            {recipe.description}
          </p>
        )}
      </header>

      {/* Main layout: content + sidebar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.1fr) minmax(0, 1.2fr)",
          gap: "1.25rem",
          alignItems: "flex-start",
        }}
      >
        {/* Left column: ingredients + steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Ingredients */}
          <section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              padding: "0.9rem 1rem",
              boxShadow: "0 4px 10px rgba(15,23,42,0.03)",
            }}
          >
            <h2
              style={{
                fontSize: "1.05rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
              }}
            >
              Ingredients{" "}
              {ingredients.length ? `(${ingredients.length})` : ""}
            </h2>
            {ingredients.length === 0 ? (
              <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                Ingredients not available.
              </p>
            ) : (
              <ul
                style={{
                  paddingLeft: "1.1rem",
                  fontSize: "0.9rem",
                  color: "#374151",
                  lineHeight: 1.55,
                }}
              >
                {ingredients.map((ing, idx) => (
                  <li key={idx}>{ing}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Steps */}
          <section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              padding: "0.9rem 1rem",
              boxShadow: "0 4px 10px rgba(15,23,42,0.03)",
            }}
          >
            <h2
              style={{
                fontSize: "1.05rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
              }}
            >
              Steps
            </h2>
            {steps.length === 0 ? (
              <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                Steps not available.
              </p>
            ) : (
              <ol
                style={{
                  paddingLeft: "1.2rem",
                  fontSize: "0.9rem",
                  color: "#374151",
                  lineHeight: 1.6,
                }}
              >
                {steps.map((step, idx) => (
                  <li key={idx} style={{ marginBottom: "0.35rem" }}>
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Right column: stats + macros */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Histogram card */}
          <RatingHistogram recipe={recipe} />

          {/* Nutrition / macros */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              padding: "0.9rem 1rem",
              boxShadow: "0 4px 10px rgba(15,23,42,0.03)",
              fontSize: "0.85rem",
              color: "#374151",
            }}
          >
            <h3
              style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                marginBottom: "0.35rem",
              }}
            >
              Nutrition (per serving, %DV)
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                rowGap: "0.25rem",
                columnGap: "0.75rem",
              }}
            >
              <span>
                <strong>Calories: </strong>
                {formatNumber(recipe.calories)}
              </span>
              <span>
                <strong>Protein: </strong>
                {formatNumber(recipe.protein_pdv)}% DV
              </span>
              <span>
                <strong>Carbs: </strong>
                {formatNumber(recipe.carbs_pdv)}% DV
              </span>
              <span>
                <strong>Fat: </strong>
                {formatNumber(recipe.fat_pdv)}% DV
              </span>
              <span>
                <strong>Sugar: </strong>
                {formatNumber(recipe.sugar_pdv)}% DV
              </span>
              <span>
                <strong>Sodium: </strong>
                {formatNumber(recipe.sodium_pdv)}% DV
              </span>
              <span>
                <strong>Sat. fat: </strong>
                {formatNumber(recipe.sat_fat_pdv)}% DV
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Similar & recommendations – full width below */}
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
        {/* Similar by tags */}
        <section style={{ flex: 1 }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "0.4rem",
            }}
          >
            Similar recipes by tags
          </h2>
          {loadingSimilar ? (
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              Loading similar recipes…
            </p>
          ) : similarByTags.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              No similar recipes found.
            </p>
          ) : (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                padding: "0.75rem 0.9rem",
                boxShadow: "0 4px 10px rgba(15,23,42,0.03)",
              }}
            >
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  fontSize: "0.85rem",
                }}
              >
                {similarByTags.map((r) => (
                  <li key={r.recipe_id}>
                    <Link
                      to={`/recipes/${r.recipe_id}`}
                      style={{
                        textDecoration: "none",
                        color: "#111827",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                      }}
                    >
                      <span>{r.name}</span>
                      <span style={{ color: "#9ca3af" }}>
                        ⭐ {formatRating(r.avg_rating)} (
                        {formatNumber(r.num_ratings)} ratings)
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Recommendations */}
        <section style={{ flex: 1 }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "0.4rem",
            }}
          >
            Recommended for you
          </h2>
          {loadingRecs ? (
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              Loading recommended recipes…
            </p>
          ) : recommendations.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              No personalized recommendations for this recipe yet.
            </p>
          ) : (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                padding: "0.75rem 0.9rem",
                boxShadow: "0 4px 10px rgba(15,23,42,0.03)",
              }}
            >
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  fontSize: "0.85rem",
                }}
              >
                {recommendations.map((r) => (
                  <li key={r.recipe_id}>
                    <Link
                      to={`/recipes/${r.recipe_id}`}
                      style={{
                        textDecoration: "none",
                        color: "#111827",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                      }}
                    >
                      <span>{r.name}</span>
                      <span style={{ color: "#9ca3af" }}>
  {(() => {
    const rating = r.avg_rating_by_similar_users ?? r.overall_avg ?? null;
    const count = r.total_ratings ?? r.unique_raters ?? 0;

    if (!count) return "No ratings yet";
    return `⭐ ${formatRating(rating)} (${formatNumber(count)} ratings)`;
  })()}
</span>

                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Reviews section at bottom */}
      <section style={{ marginTop: "1.75rem" }}>
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            padding: "0.9rem 1rem 1rem",
            boxShadow: "0 4px 10px rgba(15,23,42,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "0.5rem",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginBottom: "0.1rem",
                }}
              >
                Reviews
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#6b7280",
                }}
              >
                Showing {reviews.length} review
                {reviews.length === 1 ? "" : "s"}
                {totalRatings
                  ? ` out of ${formatNumber(totalRatings)} total`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchReviews(true)}
              disabled={reviewsLoading}
              style={{
                fontSize: "0.8rem",
                padding: "0.25rem 0.7rem",
                borderRadius: "999px",
                border: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                cursor: reviewsLoading ? "default" : "pointer",
              }}
            >
              Refresh
            </button>
          </div>

          {reviewsLoading && reviews.length === 0 && <Loader />}

          {reviewsError && (
            <div style={{ marginBottom: "0.5rem" }}>
              <ErrorMessage message={reviewsError} />
            </div>
          )}

          {!reviewsLoading && !reviewsError && reviews.length === 0 && (
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              No reviews available for this recipe yet.
            </p>
          )}

          {reviews.length > 0 && (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                fontSize: "0.9rem",
                color: "#374151",
              }}
            >
              {reviews.map((rev, idx) => {
                const rating =
                  rev.rating ?? rev.stars ?? rev.score ?? null;
                const userId = rev.user_id ?? rev.reviewer_id ?? null;
                const userName =
                  rev.username ||
                  rev.user_name ||
                  rev.reviewer_name ||
                  (userId ? `User ${userId}` : "Anonymous");
                const date =
                  rev.review_date ||
                  rev.date ||
                  rev.created_at ||
                  rev.timestamp ||
                  null;
                const text =
                  rev.review_text ||
                  rev.review ||
                  rev.comment ||
                  "";

                return (
                  <li
                    key={rev.review_id || `${idx}-${userId || "x"}`}
                    style={{
                      borderTop: idx === 0 ? "none" : "1px solid #f3f4f6",
                      paddingTop: idx === 0 ? 0 : "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: "0.15rem",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: "0.9rem",
                        }}
                      >
                        {userId ? (
                          <Link
                            to={`/users/${userId}`}
                            style={{
                              color: "#111827",
                              textDecoration: "none",
                            }}
                          >
                            {userName}
                          </Link>
                        ) : (
                          userName
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#6b7280",
                          display: "flex",
                          gap: "0.4rem",
                          alignItems: "center",
                        }}
                      >
                        {rating != null && (
                          <span>⭐ {formatRating(rating)}</span>
                        )}
                        {date && <span>· {formatDate(date)}</span>}
                      </div>
                    </div>
                    {text && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.9rem",
                          color: "#4b5563",
                        }}
                      >
                        {text}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {reviewsHasMore && (
            <div
              style={{
                marginTop: "0.75rem",
                display: "flex",
                justifyContent: "flex-start",
              }}
            >
              <button
  type="button"
  onClick={() => fetchReviews(false)}
  disabled={reviewsLoading}
  className="primary-btn"
>
  {reviewsLoading ? "Loading…" : "Load more reviews"}
</button>

            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Recipedetails;
