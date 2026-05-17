import pandas as pd
from pathlib import Path

clean = Path("data/clean")

for name in [
    "users", "recipes", "interactions",
    "ingredients", "recipe_ingredients",
    "tags", "recipe_tags"
]:
    df = pd.read_csv(clean / f"{name}.csv")
    print(name, len(df))
