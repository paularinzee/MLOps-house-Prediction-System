import json
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
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

# Enable CORS for your React frontend
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class House(BaseModel):
    area: int = Field(..., ge=500, le=20000, examples=[7420])
    bedrooms: int = Field(..., ge=1, le=10, examples=[4])
    bathrooms: int = Field(..., ge=1, le=5, examples=[2])
    stories: int = Field(..., ge=1, le=4, examples=[2])
    parking: int = Field(..., ge=0, le=4, examples=[2])
    mainroad: str = Field(..., examples=["yes"])
    guestroom: str = Field(..., examples=["no"])
    basement: str = Field(..., examples=["yes"])
    hotwaterheating: str = Field(..., examples=["no"])
    airconditioning: str = Field(..., examples=["yes"])
    prefarea: str = Field(..., examples=["yes"])
    furnishingstatus: str = Field(..., examples=["furnished"])


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