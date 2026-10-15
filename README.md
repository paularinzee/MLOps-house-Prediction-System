# House Price Prediction MLOps Stack

An end-to-end, containerized app: a Scikit-Learn pipeline, a FastAPI backend, and a React frontend that returns live price estimates.

```
User → React Frontend (Vite / Nginx) → FastAPI → Scikit-Learn pipeline (model.pkl) → Price
```

## Tech stack
- **ML:** Scikit-Learn (`GradientBoostingRegressor`, `ColumnTransformer`, `SimpleImputer`, `StandardScaler`, `OneHotEncoder`)
- **Backend:** FastAPI, Pydantic v2, Joblib, Uvicorn (lifespan state management)
- **Frontend:** React, Vite, CSS with a reactive SVG house sketch

## Prerequisites
Python 3.11, Node 20+, Docker (optional), and the dataset at `data/houses.csv`.

## Backend (local)
```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python train.py --data data/houses.csv   # creates model/model.pkl
uvicorn app.main:app --reload            # API at http://localhost:8000, docs at /docs
```

## Frontend (local)
Start the backend first, then:
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```
The frontend reads the API address from `VITE_API_BASE` (default `http://localhost:8000`).

## Docker
```bash
docker compose up --build
```
- Frontend: http://localhost:8080
- API docs: http://localhost:8000/docs

## API
| Method | Path          | Purpose                         |
|--------|---------------|---------------------------------|
| POST   | `/predict`    | Returns `predicted_price`       |
| GET    | `/model-info` | Returns `r2` and `mae`          |
| GET    | `/health`     | Health check used by Docker     |

## Notes
CORS allows `http://localhost:5173` and `http://localhost:8080`. Add your own origin in `app/main.py` when deploying elsewhere.