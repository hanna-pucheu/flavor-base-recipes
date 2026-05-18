const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// basic
app.get('/api/health', routes.health);
app.get('/api/db-test', routes.db_test);

// Q1–Q11
app.get('/api/users/top-reviewers', routes.get_review_leaderboard);
app.get('/api/recipes/leaderboard', routes.get_recipe_leaderboard);
app.get('/api/recipes/search', routes.search_recipes);
app.get('/api/recipes/:id/details', routes.get_recipe_details);
app.get('/api/recipes/:id/recommendations', routes.get_recipe_recommendations);
app.get('/api/recipes/:id/similar-by-tags', routes.get_similar_by_tags);
app.get('/api/recipes/difficulty', routes.get_recipes_by_difficulty);
app.get('/api/recipes/macro-search', routes.macro_search);
app.get('/api/recipes/controversial', routes.get_controversial_recipes);
app.get('/api/users/:id/summary', routes.get_user_summary);
app.get('/api/users/:id/reviews', routes.get_user_reviews);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
