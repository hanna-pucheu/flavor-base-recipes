// src/pages/macrosearch.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api";
import Loader from "../components/loader";
import ErrorMessage from "../components/errormessage";

const DEFAULT_LIMIT = 25;

function formatNumber(x) {
  if (x === null || x === undefined) return "N/A";
  return x.toString();
}

function formatRating(x) {
  if (x === null || x === undefined) return "N/A";
  const num = Number(x);
  if (Number.isNaN(num)) return "N/A";
  return num.toFixed(2);
}

function formatMatchScore(x) {
  if (x === null || x === undefined) return "—";
  const num = Number(x);
  if (Number.isNaN(num)) return "—";
  return num.toFixed(3);
}

export default function MacroSearch() {
  const [proteinPct, setProteinPct] = useState(30);
  const [carbsPct, setCarbsPct] = useState(50);
  const [fatPct, setFatPct] = useState(20);
  const [minCalories, setMinCalories] = useState(200);
  const [maxCalories, setMaxCalories] = useState(800);

  const [results, setResults] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const macroTotal =
    Number(proteinPct || 0) +
    Number(carbsPct || 0) +
    Number(fatPct || 0);

  async function runSearch(pageOverride) {
    const pageToLoad = pageOverride ?? page;

    try {
      setLoading(true);
      setError(null);

      const params = {
        target_protein_pct: proteinPct || 0,
        target_carbs_pct: carbsPct || 0,
        target_fat_pct: fatPct || 0,
        min_calories: minCalories || 0,
        max_calories: maxCalories || 5000,
        limit: DEFAULT_LIMIT,
        offset: pageToLoad * DEFAULT_LIMIT,
      };

      const data = await apiGet("/api/recipes/macro-search", params);

      setHasSearched(true);
      setPage(pageToLoad);
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Macro search error:", err);
      setError("Something went wrong fetching macro-friendly recipes.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    runSearch(0); // reset to first page on new search
  }

  function handlePrevPage() {
    if (loading || page === 0) return;
    runSearch(page - 1);
  }

  function handleNextPage() {
    if (loading || results.length < DEFAULT_LIMIT) return;
    runSearch(page + 1);
  }

  const canGoPrev = page > 0;
  const canGoNext = results.length === DEFAULT_LIMIT;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Macro Search</h1>
        <p className="page-subtitle">
          Find recipes that match your target protein, carbs, and fat percentages.
        </p>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="card-header">
          <h2>Nutrition Targets</h2>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="proteinPct">Protein %</label>
              <input
                id="proteinPct"
                type="number"
                min="0"
                max="100"
                value={proteinPct}
                onChange={(e) => setProteinPct(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="carbsPct">Carbs %</label>
              <input
                id="carbsPct"
                type="number"
                min="0"
                max="100"
                value={carbsPct}
                onChange={(e) => setCarbsPct(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="fatPct">Fat %</label>
              <input
                id="fatPct"
                type="number"
                min="0"
                max="100"
                value={fatPct}
                onChange={(e) => setFatPct(e.target.value)}
              />
            </div>

            <div className="form-group macro-total">
              <label>Total</label>
              <div
                className={
                  macroTotal === 100 ? "badge badge-good" : "badge badge-warn"
                }
              >
                {macroTotal}%{" "}
                {macroTotal === 100 ? "✓ balanced" : " (doesn’t have to be 100%)"}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="minCalories">Min calories</label>
              <input
                id="minCalories"
                type="number"
                min="0"
                value={minCalories}
                onChange={(e) => setMinCalories(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxCalories">Max calories</label>
              <input
                id="maxCalories"
                type="number"
                min="0"
                value={maxCalories}
                onChange={(e) => setMaxCalories(e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {loading && <Loader />}
      {error && <ErrorMessage message={error} />}

      {!loading && hasSearched && results.length === 0 && !error && (
        <p>No recipes found for that macro profile.</p>
      )}

      {!loading && results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Matching Recipes</h2>
            <p className="card-subtitle">
              Smaller “Match score” means closer to your macro targets.
            </p>
          </div>
          <div className="card-body">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recipe</th>
                    <th>Calories</th>
                    <th>Macros (% P / C / F)</th>
                    <th>Rating</th>
                    <th># Ratings</th>
                    <th>Match score</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.recipe_id}>
                      <td>
                        <Link to={`/recipes/${r.recipe_id}`}>{r.name}</Link>
                      </td>
                      <td>{formatNumber(r.calories)}</td>
                      <td>
                        {formatNumber(r.protein_cal_pct)} /{" "}
                        {formatNumber(r.carbs_cal_pct)} /{" "}
                        {formatNumber(r.fat_cal_pct)}
                      </td>
                      <td>{formatRating(r.avg_rating)}</td>
                      <td>{formatNumber(r.num_ratings)}</td>
                      <td>{formatMatchScore(r.total_nutrition_distance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card-footer">
              <div className="pagination-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePrevPage}
                  disabled={!canGoPrev || loading}
                >
                  ← Previous
                </button>
                <span className="muted">Page {page + 1}</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleNextPage}
                  disabled={!canGoNext || loading}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
