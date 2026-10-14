import json
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
STATIC = Path(__file__).parent / "static"
state = {}


# context manager to handle startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Deserialize once at startup, not on every request
    state["model"] = joblib.load(ROOT / "model" / "model.pkl")
    state["meta"] = json.loads((ROOT / "model" / "metadata.json").read_text())
    yield
    state.clear()


app = FastAPI(title="House Price Prediction API", version="1.0.0", lifespan=lifespan)


class House(BaseModel):
    area_sqft: float = Field(..., ge=300, le=10000, examples=[1800])
    bedrooms: int = Field(..., ge=1, le=10, examples=[3])
    bathrooms: int = Field(..., ge=1, le=10, examples=[2])
    age_years: float = Field(..., ge=0, le=150, examples=[10])
    location_score: int = Field(..., ge=1, le=10, description="1 = remote, 10 = prime", examples=[7])
    garage: int = Field(..., ge=0, le=5, examples=[1])


class Prediction(BaseModel):
    predicted_price: float
    currency: str = "USD"


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": "model" in state}


@app.get("/model-info")
def model_info():
    return state["meta"]


@app.post("/predict", response_model=Prediction)
def predict(house: House):
    row = pd.DataFrame([house.model_dump()])[state["meta"]["features"]]
    price = float(state["model"].predict(row)[0])
    return Prediction(predicted_price=round(price, 2))


@app.get("/", include_in_schema=False)
def ui():
    return FileResponse(STATIC / "index.html")


app.mount("/static", StaticFiles(directory=STATIC), name="static")
