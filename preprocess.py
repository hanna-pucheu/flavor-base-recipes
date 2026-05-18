import ast, pandas as pd
from pathlib import Path

RAW = Path("data/raw"); OUT = Path("data/clean"); OUT.mkdir(parents=True, exist_ok=True)

# load
R = pd.read_csv(RAW/"RAW_recipes.csv", low_memory=False)
I = pd.read_csv(RAW/"RAW_interactions.csv", low_memory=False)

# users
users = pd.DataFrame(
    pd.concat([R["contributor_id"], I["user_id"]], ignore_index=True)
      .dropna().astype("int64").drop_duplicates()
)
users.columns = ["user_id"]; users["username"] = "user_" + users["user_id"].astype(str)
users.to_csv(OUT/"users.csv", index=False)

# recipes
recipes = (R.rename(columns={"id":"recipe_id","submitted":"submitted_date"})
             [["recipe_id","name","description","minutes","n_steps","steps",
               "n_ingredients","submitted_date","contributor_id"]]
             .drop_duplicates())
# adding the ntritional info

def _split_nut(s):
    try:
        v = ast.literal_eval(str(s))
        if isinstance(v, (list, tuple)) and len(v) == 7:
            return pd.Series({
                "calories": v[0],
                "fat_pdv": v[1],
                "sugar_pdv": v[2],
                "sodium_pdv": v[3],
                "protein_pdv": v[4],
                "sat_fat_pdv": v[5],
                "carbs_pdv": v[6],
            })
    except Exception:
        pass
    return pd.Series({k: pd.NA for k in
        ["calories","fat_pdv","sugar_pdv","sodium_pdv","protein_pdv","sat_fat_pdv","carbs_pdv"]})

nut = (R[["id","nutrition"]]
       .rename(columns={"id":"recipe_id"}))
nut = pd.concat([nut.drop(columns=["nutrition"]), nut["nutrition"].apply(_split_nut)], axis=1)

recipes = recipes.merge(nut, on="recipe_id", how="left")

recipes.to_csv(OUT/"recipes.csv", index=False)

# interactions
inter = I.copy()
inter["rating"] = pd.to_numeric(inter["rating"], errors="coerce")
inter = inter[(inter["rating"].between(0,5)) | inter["rating"].isna()]
inter["date"] = pd.to_datetime(inter["date"], errors="coerce").dt.date
inter = inter.dropna(subset=["user_id","recipe_id"]).copy()
inter["user_id"] = inter["user_id"].astype("int64"); inter["recipe_id"] = inter["recipe_id"].astype("int64")
inter.to_csv(OUT/"interactions.csv", index=False)

# helpers
def parse_list_col(s):
    if pd.isna(s) or str(s).strip()=="":
        return []
    try:
        v = ast.literal_eval(str(s))
        return [str(x).strip().lower() for x in v] if isinstance(v,(list,tuple)) else []
    except Exception:
        return [t.strip().lower() for t in str(s).split(",") if t.strip()]

# tags and tags relation table
rtag = (R[["id","tags"]].rename(columns={"id":"recipe_id"})
          .assign(tags=lambda d: d["tags"].apply(parse_list_col))
          .explode("tags").dropna())
tag_codes, tag_vals = pd.factorize(rtag["tags"])
tags = pd.DataFrame({"tag_id":range(1,len(tag_vals)+1), "tag":tag_vals})
recipe_tags = rtag.assign(tag_id=tag_codes+1)[["recipe_id","tag_id"]].drop_duplicates()
tags.to_csv(OUT/"tags.csv", index=False)
recipe_tags.to_csv(OUT/"recipe_tags.csv", index=False)

# ingredients and ingredients relation table
ring = (R[["id","ingredients"]].rename(columns={"id":"recipe_id"})
          .assign(ingredients=lambda d: d["ingredients"].apply(parse_list_col))
          .explode("ingredients").dropna())
ing_codes, ing_vals = pd.factorize(ring["ingredients"])
ingredients = pd.DataFrame({"ingredient_id":range(1,len(ing_vals)+1), "name":ing_vals})
recipe_ingredients = ring.assign(ingredient_id=ing_codes+1)[["recipe_id","ingredient_id"]].drop_duplicates()
ingredients.to_csv(OUT/"ingredients.csv", index=False)
recipe_ingredients.to_csv(OUT/"recipe_ingredients.csv", index=False)

print("done")
