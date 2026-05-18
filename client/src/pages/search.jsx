// src/pages/search.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api";
import Loader from "../components/loader";
import ErrorMessage from "../components/errormessage";

const PAGE_SIZE = 50;

const DEFAULT_FILTERS = {
  name: "",
  minutesLow: 0,
  minutesHigh: 5000,
  ingredientsLow: 1,
  ingredientsHigh: 40,
  // steps are required by the backend query but we keep them hidden in the UI
  stepsLow: 0,
  stepsHigh: 60,
  ratingLow: 0,
  ratingHigh: 5,
};

function SearchPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  };

  const fetchResults = async (pageOverride) => {
    const currentPage = pageOverride ?? page;
    setLoading(true);
    setError(null);

    try {
      const params = {
        name: filters.name.trim(),
        minutesLow: filters.minutesLow || 0,
        minutesHigh: filters.minutesHigh || 5000,
        ingredientsLow: filters.ingredientsLow || 1,
        ingredientsHigh: filters.ingredientsHigh || 40,
        // hidden but required by backend
        stepsLow: filters.stepsLow || 0,
        stepsHigh: filters.stepsHigh || 60,
        ratingLow: filters.ratingLow || 0,
        ratingHigh: filters.ratingHigh || 5,
        limit: PAGE_SIZE,
        offset: currentPage * PAGE_SIZE,
      };

      const data = await apiGet("/api/recipes/search", params);
      setResults(Array.isArray(data) ? data : []);
      setHasSearched(true);
      setPage(currentPage);
    } catch (err) {
      console.error("Search error", err);
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial search so the page isn't empty
    fetchResults(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchResults(0);
  };

  const handlePrevPage = () => {
    if (loading || page === 0) return;
    fetchResults(page - 1);
  };

  const handleNextPage = () => {
    if (loading || results.length < PAGE_SIZE) return;
    fetchResults(page + 1);
  };


  const getRating = (recipe) => {
    // Try several possible fields and coerce to Number
    const candidates = [
      recipe.avg_rating,
      recipe.average_rating,
      recipe.mean_rating,
      recipe.rating,
    ];

    for (const value of candidates) {
      if (value === null || value === undefined) continue;
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }
    return null; // no rating available
  };

  const formatMinutes = (m) =>
    m === null || m === undefined ? "—" : `${m} min`;

  const formatIngredients = (n) =>
    n === null || n === undefined ? "—" : `${n} ingredients`;

  const formatRatingLine = (recipe) => {
    const r = getRating(recipe);
    const n = Number(recipe.num_ratings ?? recipe.n_ratings ?? 0);

    if (!n) return "No ratings yet";
    if (r === null) return `${n} ratings`;

    return `${r.toFixed(2)} (${n} ratings)`;
  };


  const canGoPrev = page > 0;
  const canGoNext = results.length === PAGE_SIZE; // assume more if we filled the page

  return (
    <div className="page search-page">
      <header className="page-header search-hero">
        <div className="search-hero-text">
          <h1>Search recipes</h1>
          <p className="muted">
            Filter by name, cook time, rating, and ingredient count. Click a recipe
            to open its full Flavor Base profile.
          </p>
        </div>
      </header>

      <div className="search-layout">
        <aside className="search-panel">
          <div className="panel-head">
            <h2 className="panel-title">Filters</h2>
            <p className="muted panel-subtitle">
              Adjust values, then hit <b>Search</b>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="search-form">
            <div className="form-section">
              <label className="field">
                <span className="field-label">Name contains</span>
                <input
                  className="input"
                  type="text"
                  name="name"
                  value={filters.name}
                  onChange={handleInputChange}
                  placeholder="e.g. pasta, curry, bread"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="form-section">
              <div className="section-title">Cook time (minutes)</div>
              <div className="two-col">
                <label className="field">
                  <span className="field-label">Min</span>
                  <input
                    className="input"
                    type="number"
                    name="minutesLow"
                    value={filters.minutesLow}
                    onChange={handleInputChange}
                    min="0"
                    inputMode="numeric"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Max</span>
                  <input
                    className="input"
                    type="number"
                    name="minutesHigh"
                    value={filters.minutesHigh}
                    onChange={handleInputChange}
                    min="0"
                    inputMode="numeric"
                  />
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">Rating (0–5)</div>
              <div className="two-col">
                <label className="field">
                  <span className="field-label">Min</span>
                  <input
                    className="input"
                    type="number"
                    name="ratingLow"
                    value={filters.ratingLow}
                    onChange={handleInputChange}
                    min="0"
                    max="5"
                    step="0.1"
                    inputMode="decimal"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Max</span>
                  <input
                    className="input"
                    type="number"
                    name="ratingHigh"
                    value={filters.ratingHigh}
                    onChange={handleInputChange}
                    min="0"
                    max="5"
                    step="0.1"
                    inputMode="decimal"
                  />
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">Ingredients</div>
              <div className="two-col">
                <label className="field">
                  <span className="field-label">Min</span>
                  <input
                    className="input"
                    type="number"
                    name="ingredientsLow"
                    value={filters.ingredientsLow}
                    onChange={handleInputChange}
                    min="1"
                    inputMode="numeric"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Max</span>
                  <input
                    className="input"
                    type="number"
                    name="ingredientsHigh"
                    value={filters.ingredientsHigh}
                    onChange={handleInputChange}
                    min="1"
                    inputMode="numeric"
                  />
                </label>
              </div>
            </div>

            <div className="actions-row">
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={resetFilters}
                disabled={loading}
              >
                Reset
              </button>
            </div>
          </form>
        </aside>

        <section className="search-results">
          {loading && (
            <div className="results-loading">
              <Loader />
            </div>
          )}

          {error && <ErrorMessage message={error} />}

          {hasSearched && !loading && !error && (
            <>
              <div className="results-header">
                <div>
                  <h2>Results</h2>
                  <p className="muted">
                    Showing {results.length} recipe{results.length === 1 ? "" : "s"} ·
                    Page {page + 1}
                  </p>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="empty-state">
                  <h3>No matches</h3>
                  <p className="muted">
                    Try widening your filters or clearing the name field.
                  </p>
                </div>
              ) : (
                <>
                  <div className="card-grid">
                    {results.map((recipe) => (
                      <div key={recipe.recipe_id} className="card recipe-card">
                        <div className="card-header">
                          <Link
                            to={`/recipes/${recipe.recipe_id}`}
                            className="card-title-link"
                            title={recipe.name}
                          >
                            {recipe.name}
                          </Link>
                        </div>

                        <div className="card-body">
                          <div className="card-meta">
                            <span className="pill">
                              {formatMinutes(recipe.minutes)}
                            </span>
                            <span className="pill">
                              {formatIngredients(recipe.n_ingredients)}
                            </span>
                          </div>

                          <div className="card-rating muted">
                            ⭐ {formatRatingLine(recipe)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pagination-row">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handlePrevPage}
                      disabled={!canGoPrev || loading}
                    >
                      ← Previous
                    </button>
                    <span className="muted">Page {page + 1}</span>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleNextPage}
                      disabled={!canGoNext || loading}
                    >
                      Next →
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default SearchPage;
