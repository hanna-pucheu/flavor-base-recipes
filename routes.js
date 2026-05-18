// server/routes.js

const { Pool, types } = require('pg');
const config = require('./config.json');

// Make BIGINT (int8) parse as JS number
types.setTypeParser(20, (val) => parseInt(val, 10));

// Create DB connection pool
const connection = new Pool({
  host: config.rds_host,
  user: config.rds_user,
  password: config.rds_password,
  port: config.rds_port,
  database: config.rds_db,
  ssl: { rejectUnauthorized: false },
});

connection.connect((err) => err && console.log('DB connection error:', err));

/******************
 * BASIC UTILITY ROUTES
 ******************/

// GET /api/health
const health = async (req, res) => {
  res.json({ status: 'ok', message: 'Recipe API is running' });
};

// GET /api/db-test – connectivity check
const db_test = async (req, res) => {
  try {
    const result = await connection.query('SELECT NOW() AS current_time;');
    res.json(result.rows);
  } catch (err) {
    console.error('DB test failed:', err);
    res.status(500).json({ error: 'DB test failed' });
  }
};

/******************
 * QUERY 1 – REVIEW LEADERBOARD
 * GET /api/users/top-reviewers
 ******************/

const get_review_leaderboard = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  const queryText = `
    SELECT
      u.user_id,
      u.username,
      COUNT(i.review) AS review_count,
      COUNT(DISTINCT i.recipe_id) AS unique_recipes_reviewed,
      AVG(i.rating) AS avg_rating_given
    FROM Users u
    INNER JOIN Interactions i ON u.user_id = i.user_id
    GROUP BY u.user_id, u.username
    ORDER BY review_count DESC
    LIMIT $1;
  `;

  try {
    const { rows } = await connection.query(queryText, [limit]);
    res.json(rows);
  } catch (err) {
    console.error('get_review_leaderboard failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/******************
 * QUERY 2 – RECIPE LEADERBOARD
 * GET /api/recipes/leaderboard
 ******************/

const get_recipe_leaderboard = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  const queryText = `
    WITH avg_rating AS (
      SELECT
        recipe_id,
        COUNT(*) AS num_ratings,
        AVG(rating) AS avg_rating
      FROM Interactions
      GROUP BY recipe_id
    )
    SELECT
      r.recipe_id,
      r.name,
      a.avg_rating,
      a.num_ratings,
      r.minutes
    FROM Recipes r
    JOIN avg_rating a ON r.recipe_id = a.recipe_id
    ORDER BY a.avg_rating DESC, a.num_ratings DESC
    LIMIT $1;
  `;

  try {
    const { rows } = await connection.query(queryText, [limit]);
    res.json(rows);
  } catch (err) {
    console.error('get_recipe_leaderboard failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/******************
 * QUERY 3 – RECIPE SEARCH (COMPLEX)
 * GET /api/recipes/search
 * Params (query):
 *   name, tags (comma-separated), minutesLow/High, ingredientsLow/High,
 *   stepsLow/High, ratingLow/High
 ******************/

const search_recipes = async (req, res) => {
  const rawTags = req.query.tags ?? '';
  const hasTags = rawTags.trim().length > 0;
  const tags = hasTags
    ? rawTags.split(',').map((t) => t.trim().toLowerCase())
    : [];

  const name = req.query.name ?? '';

  const minutesLow = parseInt(req.query.minutesLow, 10) ?? 0;
  const minutesHigh = parseInt(req.query.minutesHigh, 10) ?? 201610;

  const ingredientsLow = parseInt(req.query.ingredientsLow, 10) ?? 1;
  const ingredientsHigh = parseInt(req.query.ingredientsHigh, 10) ?? 43;

  const stepsLow = parseInt(req.query.stepsLow, 10) ?? 0;
  const stepsHigh = parseInt(req.query.stepsHigh, 10) ?? 108;

  const ratingLow = parseFloat(req.query.ratingLow) ?? 0;
  const ratingHigh = parseFloat(req.query.ratingHigh) ?? 5;

  try {
    let queryText;
    let params;

    if (!hasTags) {
      // simpler version: only name + numeric filters
      queryText = `
        SELECT
          r.recipe_id,
          r.name,
          r.minutes,
          r.n_ingredients,
          r.n_steps,
          AVG(i.rating) AS rating
        FROM Recipes r
        LEFT JOIN Interactions i ON r.recipe_id = i.recipe_id
        WHERE r.name ILIKE '%' || $1 || '%'
          AND r.minutes BETWEEN $2 AND $3
          AND r.n_ingredients BETWEEN $4 AND $5
          AND r.n_steps BETWEEN $6 AND $7
        GROUP BY r.recipe_id
        HAVING COALESCE(AVG(i.rating), 0) BETWEEN $8 AND $9;
      `;
      params = [
        name,
        minutesLow,
        minutesHigh,
        ingredientsLow,
        ingredientsHigh,
        stepsLow,
        stepsHigh,
        ratingLow,
        ratingHigh,
      ];
    } else {
      // full query from Milestone 3
      queryText = `
        WITH user_tags AS (
          SELECT unnest($1::text[]) AS tag
        ),
        tag_matched AS (
          SELECT rt.recipe_id
          FROM recipe_tags rt
          JOIN tags t ON t.tag_id = rt.tag_id
          JOIN user_tags ut ON replace(t.tag, '-', ' ') ILIKE '%' || ut.tag || '%'
          GROUP BY rt.recipe_id
          HAVING COUNT(DISTINCT ut.tag) = (SELECT COUNT(*) FROM user_tags)
        ),
        name_matched AS (
          SELECT recipe_id
          FROM recipes
          WHERE name ILIKE '%' || $2 || '%'
        ),
        combined AS (
          SELECT recipe_id FROM tag_matched
          UNION
          SELECT recipe_id FROM name_matched
        )
        SELECT
          r.recipe_id,
          r.name,
          r.minutes,
          r.n_ingredients,
          r.n_steps,
          AVG(i.rating) AS rating,
          ARRAY_AGG(DISTINCT t.tag ORDER BY t.tag) AS tags
        FROM combined c
        JOIN recipes r ON r.recipe_id = c.recipe_id
        LEFT JOIN interactions i ON r.recipe_id = i.recipe_id
        LEFT JOIN recipe_tags rt ON r.recipe_id = rt.recipe_id
        LEFT JOIN tags t ON t.tag_id = rt.tag_id
        WHERE (r.minutes BETWEEN $3 AND $4)
          AND (r.n_ingredients BETWEEN $5 AND $6)
          AND (r.n_steps BETWEEN $7 AND $8)
        GROUP BY r.recipe_id
        HAVING AVG(i.rating) BETWEEN $9 AND $10;
      `;
      params = [
        tags,
        name,
        minutesLow,
        minutesHigh,
        ingredientsLow,
        ingredientsHigh,
        stepsLow,
        stepsHigh,
        ratingLow,
        ratingHigh,
      ];
    }

    const { rows } = await connection.query(queryText, params);
    res.json(rows);
  } catch (err) {
    console.error('search_recipes failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// QUERY 4 – RECIPE DETAILS PAGE
// GET /api/recipes/:id/details
const get_recipe_details = async (req, res) => {
  const recipeId = parseInt(req.params.id, 10);

  const queryText = `
    SELECT
      r.recipe_id,
      r.name,
      r.description,
      r.minutes,
      r.n_steps,
      r.steps,
      r.submitted_date,
      r.calories,
      r.protein_pdv,
      r.carbs_pdv,
      r.fat_pdv,
      r.sugar_pdv,
      r.sodium_pdv,
      r.sat_fat_pdv,
      ri.ingredients AS ingredients_raw,
      COUNT(i.rating) FILTER (WHERE i.rating = 5) AS five_star_count,
      COUNT(i.rating) FILTER (WHERE i.rating = 4) AS four_star_count,
      COUNT(i.rating) FILTER (WHERE i.rating = 3) AS three_star_count,
      COUNT(i.rating) FILTER (WHERE i.rating = 2) AS two_star_count,
      COUNT(i.rating) FILTER (WHERE i.rating = 1) AS one_star_count,
      AVG(i.rating) AS avg_rating,
      COUNT(i.rating) AS total_ratings
    FROM recipes r
    LEFT JOIN interactions i ON r.recipe_id = i.recipe_id
    LEFT JOIN recipe_ingredients ri ON r.recipe_id = ri.recipe_id
    WHERE r.recipe_id = $1
    GROUP BY
      r.recipe_id, r.name, r.description, r.minutes, r.n_steps, r.steps,
      r.submitted_date, r.calories, r.protein_pdv, r.carbs_pdv, r.fat_pdv,
      r.sugar_pdv, r.sodium_pdv, r.sat_fat_pdv, ri.ingredients;
  `;

  try {
    const { rows } = await connection.query(queryText, [recipeId]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error('get_recipe_details failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


/******************
 * QUERY 5 – RECIPE RECOMMENDATIONS (SIMILAR USERS)
 * GET /api/recipes/:id/recommendations
 ******************/

const get_recipe_recommendations = async (req, res) => {
  const recipeId = parseInt(req.params.id, 10);

  const queryText = `
    WITH similar_users AS (
      SELECT DISTINCT i1.user_id,
             COUNT(*) AS shared_ratings
      FROM Interactions i1
      JOIN Interactions i2
        ON i1.user_id = i2.user_id
       AND i2.rating >= 4
       AND i1.recipe_id != $1
      GROUP BY i1.user_id
    )
    SELECT
      r.recipe_id,
      r.name,
      r.description,
      r.minutes,
      r.n_steps,
      COUNT(DISTINCT i.user_id) AS similar_user_count,
      AVG(i.rating) AS avg_rating_by_similar_users,
      (SELECT AVG(rating) FROM Interactions WHERE recipe_id = r.recipe_id) AS overall_avg,
      (SELECT COUNT(*) FROM Interactions WHERE recipe_id = r.recipe_id) AS total_ratings,
      (SELECT COUNT(DISTINCT user_id) FROM Interactions WHERE recipe_id = r.recipe_id) AS unique_raters
    FROM Interactions i
    JOIN similar_users su ON i.user_id = su.user_id
    JOIN Recipes r ON i.recipe_id = r.recipe_id
    WHERE i.rating >= 4
    GROUP BY r.recipe_id, r.name, r.description, r.minutes, r.n_steps
    HAVING COUNT(DISTINCT i.user_id) >= 2
    ORDER BY similar_user_count DESC, avg_rating_by_similar_users DESC;
  `;

  try {
    const { rows } = await connection.query(queryText, [recipeId]);
    res.json(rows);
  } catch (err) {
    console.error('get_recipe_recommendations failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/******************
 * QUERY 6 – SIMILAR RECIPES BY TAGS
 * GET /api/recipes/:id/similar-by-tags
 ******************/

const get_similar_by_tags = async (req, res) => {
  const recipeId = parseInt(req.params.id, 10);

  const queryText = `
    WITH current_recipe_tags AS (
      SELECT tag_id
      FROM Recipe_tags
      WHERE recipe_id = $1
    ),
    tag_matches AS (
      SELECT
        rt.recipe_id,
        COUNT(*) AS matching_tags,
        (SELECT COUNT(*) FROM Recipe_tags WHERE recipe_id = rt.recipe_id) AS total_tags
      FROM Recipe_tags rt
      WHERE rt.tag_id IN (SELECT tag_id FROM current_recipe_tags)
        AND rt.recipe_id != $1
      GROUP BY rt.recipe_id
    )
    SELECT
      $1 AS target_recipe_id,
      r.recipe_id,
      r.name,
      r.description,
      r.minutes,
      tm.matching_tags,
      tm.total_tags,
      ROUND(tm.matching_tags * 1.0 / tm.total_tags, 3) AS similarity_ratio,
      (SELECT AVG(rating) FROM Interactions WHERE recipe_id = r.recipe_id) AS avg_rating,
      (SELECT COUNT(*) FROM Interactions WHERE recipe_id = r.recipe_id) AS num_ratings,
      (SELECT COUNT(DISTINCT user_id) FROM Interactions WHERE recipe_id = r.recipe_id) AS unique_raters
    FROM tag_matches tm
    JOIN Recipes r ON tm.recipe_id = r.recipe_id
    ORDER BY tm.matching_tags DESC, similarity_ratio DESC;
  `;

  try {
    const { rows } = await connection.query(queryText, [recipeId]);
    res.json(rows);
  } catch (err) {
    console.error('get_similar_by_tags failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/******************
 * QUERY 7 – RECIPES BY DIFFICULTY CLASSIFICATION
 * GET /api/recipes/difficulty
 ******************/

const get_recipes_by_difficulty = async (req, res) => {
  const queryText = `
    WITH time_divs AS (
      SELECT
        percentile_cont(0.33) WITHIN GROUP (ORDER BY minutes) AS p33,
        percentile_cont(0.67) WITHIN GROUP (ORDER BY minutes) AS p67
      FROM Recipes
    ),
    step_divs AS (
      SELECT
        percentile_cont(0.33) WITHIN GROUP (ORDER BY n_steps) AS p33,
        percentile_cont(0.67) WITHIN GROUP (ORDER BY n_steps) AS p67
      FROM Recipes
    ),
    ing_divs AS (
      SELECT
        percentile_cont(0.33) WITHIN GROUP (ORDER BY n_ingredients) AS p33,
        percentile_cont(0.67) WITHIN GROUP (ORDER BY n_ingredients) AS p67
      FROM Recipes
    ),
    calcs AS (
      SELECT
        r.recipe_id,
        r.name,
        CASE
          WHEN r.minutes > t.p67 THEN 2
          WHEN r.minutes > t.p33 THEN 1
          ELSE 0
        END AS time_score,
        CASE
          WHEN r.n_steps > s.p67 THEN 2
          WHEN r.n_steps > s.p33 THEN 1
          ELSE 0
        END AS step_score,
        CASE
          WHEN r.n_ingredients > i.p67 THEN 2
          WHEN r.n_ingredients > i.p33 THEN 1
          ELSE 0
        END AS ing_score
      FROM Recipes r
      CROSS JOIN time_divs t
      CROSS JOIN step_divs s
      CROSS JOIN ing_divs i
    )
    SELECT
      recipe_id,
      CASE
        WHEN time_score + step_score + ing_score >= 5 THEN 'Hard'
        WHEN time_score + step_score + ing_score >= 3 THEN 'Medium'
        ELSE 'Easy'
      END AS difficulty
    FROM calcs;
  `;

  try {
    const { rows } = await connection.query(queryText);
    res.json(rows);
  } catch (err) {
    console.error('get_recipes_by_difficulty failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/******************
 * QUERY 8 – MACRO SEARCH (NUTRITIONAL TARGETS)
 * GET /api/recipes/macro-search
 * Params:
 *   target_protein_pct, target_carbs_pct, target_fat_pct,
 *   min_calories, max_calories
 ******************/

const macro_search = async (req, res) => {
  const target_protein_pct = req.query.target_protein_pct
    ? parseFloat(req.query.target_protein_pct)
    : 30;
  const target_carbs_pct = req.query.target_carbs_pct
    ? parseFloat(req.query.target_carbs_pct)
    : 50;
  const target_fat_pct = req.query.target_fat_pct
    ? parseFloat(req.query.target_fat_pct)
    : 20;

  const min_calories = req.query.min_calories
    ? parseFloat(req.query.min_calories)
    : 0;
  const max_calories = req.query.max_calories
    ? parseFloat(req.query.max_calories)
    : 21497.8;

  const queryText = `
    WITH recipe_macro_percentages AS (
      SELECT
        r.recipe_id,
        r.name,
        r.calories,
        r.protein_pdv,
        r.carbs_pdv,
        r.fat_pdv,
        CASE
          WHEN r.calories > 0 THEN
            ROUND(((r.protein_pdv / 100.0 * 50) * 4 / r.calories * 100), 1)
          ELSE 0
        END AS protein_cal_pct,
        CASE
          WHEN r.calories > 0 THEN
            ROUND(((r.carbs_pdv / 100.0 * 300) * 4 / r.calories * 100), 1)
          ELSE 0
        END AS carbs_cal_pct,
        CASE
          WHEN r.calories > 0 THEN
            ROUND(((r.fat_pdv / 100.0 * 65) * 9 / r.calories * 100), 1)
          ELSE 0
        END AS fat_cal_pct
      FROM Recipes r
      WHERE r.calories BETWEEN $1 AND $2
        AND r.protein_pdv IS NOT NULL
        AND r.carbs_pdv IS NOT NULL
        AND r.fat_pdv IS NOT NULL
        AND r.calories > 0
    )
    SELECT
      rmp.recipe_id,
      rmp.name,
      rmp.calories,
      rmp.protein_pdv,
      rmp.carbs_pdv,
      rmp.fat_pdv,
      rmp.protein_cal_pct,
      rmp.carbs_cal_pct,
      rmp.fat_cal_pct,
      AVG(i.rating) AS avg_rating,
      COUNT(i.rating) AS num_ratings,
      ABS(rmp.protein_cal_pct - $3) AS protein_distance,
      ABS(rmp.carbs_cal_pct - $4) AS carbs_distance,
      ABS(rmp.fat_cal_pct - $5) AS fat_distance,
      SQRT(
        POWER((rmp.protein_cal_pct - $3), 2) +
        POWER((rmp.carbs_cal_pct - $4), 2) +
        POWER((rmp.fat_cal_pct - $5), 2)
      ) AS total_nutrition_distance
    FROM recipe_macro_percentages rmp
    LEFT JOIN Interactions i ON rmp.recipe_id = i.recipe_id
    GROUP BY
      rmp.recipe_id,
      rmp.name,
      rmp.calories,
      rmp.protein_pdv,
      rmp.carbs_pdv,
      rmp.fat_pdv,
      rmp.protein_cal_pct,
      rmp.carbs_cal_pct,
      rmp.fat_cal_pct
    ORDER BY total_nutrition_distance ASC, avg_rating DESC;
  `;

  try {
    const { rows } = await connection.query(queryText, [
      min_calories,
      max_calories,
      target_protein_pct,
      target_carbs_pct,
      target_fat_pct,
    ]);
    res.json(rows);
  } catch (err) {
    console.error('macro_search failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/******************
 * QUERY 9 – CONTROVERSIAL RECIPES
 * GET /api/recipes/controversial
 ******************/

const get_controversial_recipes = async (req, res) => {
  const queryText = `
    WITH rating_dist AS (
      SELECT
        r.recipe_id,
        r.name,
        COUNT(*) AS n_ratings,
        SUM(CASE WHEN i.rating = 5 THEN 1 ELSE 0 END) AS n_5stars,
        SUM(CASE WHEN i.rating = 1 THEN 1 ELSE 0 END) AS n_1stars
      FROM Recipes r
      JOIN Interactions i ON r.recipe_id = i.recipe_id
      GROUP BY r.recipe_id, r.name
    ),
    controversial AS (
      SELECT
        *,
        ROUND(n_5stars::decimal / n_ratings, 2) AS pct_5,
        ROUND(n_1stars::decimal / n_ratings, 2) AS pct_1
      FROM rating_dist
    )
    SELECT
      recipe_id,
      name,
      n_ratings,
      pct_5,
      pct_1
    FROM controversial
    WHERE n_ratings >= 15
      AND pct_5 >= 0.25
      AND pct_1 >= 0.15
    ORDER BY (pct_5 + pct_1) DESC, n_ratings DESC;
  `;

  try {
    const { rows } = await connection.query(queryText);
    res.json(rows);
  } catch (err) {
    console.error('get_controversial_recipes failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/******************
 * QUERY 10 – USER SUMMARY
 * GET /api/users/:id/summary
 ******************/

const get_user_summary = async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  const queryText = `
    SELECT
      user_id,
      COUNT(review) AS n_reviews,
      ROUND(AVG(rating), 2) AS avg_rating
    FROM Interactions
    GROUP BY user_id
    HAVING user_id = $1;
  `;

  try {
    const { rows } = await connection.query(queryText, [userId]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error('get_user_summary failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/******************
 * QUERY 11 – USER REVIEWS
 * GET /api/users/:id/reviews
 ******************/

const get_user_reviews = async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  const queryText = `
    SELECT
      i.recipe_id,
      r.name,
      i.date,
      i.rating,
      i.review
    FROM Interactions i
    NATURAL JOIN Recipes r
    WHERE i.user_id = $1
    ORDER BY i.date DESC;
  `;

  try {
    const { rows } = await connection.query(queryText, [userId]);
    res.json(rows);
  } catch (err) {
    console.error('get_user_reviews failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  connection,
  health,
  db_test,
  get_review_leaderboard,
  get_recipe_leaderboard,
  search_recipes,
  get_recipe_details,
  get_recipe_recommendations,
  get_similar_by_tags,
  get_recipes_by_difficulty,
  macro_search,
  get_controversial_recipes,
  get_user_summary,
  get_user_reviews,
};
