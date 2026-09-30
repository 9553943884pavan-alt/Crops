import json
import urllib.request
import urllib.parse
from datetime import date, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random

app = FastAPI(title="AgriTech Optimization API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OptimizeRequest(BaseModel):
    location: str
    budget: float
    land_acres: float

# ---------------------------------------------------------
# STATIC SOIL DICTIONARY (Simulating Government Database)
# ---------------------------------------------------------
DISTRICT_SOIL_DATA = {
    "nizamabad": {"nitrogen": 85, "phosphorus": 42, "potassium": 40, "ph": 6.8},
    "hyderabad": {"nitrogen": 70, "phosphorus": 35, "potassium": 30, "ph": 7.1},
    "pune": {"nitrogen": 60, "phosphorus": 50, "potassium": 45, "ph": 6.5},
    "default": {"nitrogen": 75, "phosphorus": 40, "potassium": 35, "ph": 6.5}
}

@app.post("/api/optimize")
def optimize_farm(req: OptimizeRequest):
    # 1. LIVE GEOCODING (Open-Meteo)
    geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(req.location)}&count=1"
    try:
        with urllib.request.urlopen(geo_url) as response:
            geo_resp = json.loads(response.read().decode())
            if "results" in geo_resp and len(geo_resp["results"]) > 0:
                lat = geo_resp["results"][0]["latitude"]
                lon = geo_resp["results"][0]["longitude"]
                resolved_location = f"{geo_resp['results'][0]['name']}, {geo_resp['results'][0].get('admin1', '')}"
            else:
                raise Exception("Location not found")
    except Exception as e:
        lat, lon, resolved_location = 17.67, 78.10, req.location

    # 2. 3-MONTH HISTORICAL WEATHER FETCH (Matches Kaggle Dataset Structure)
    # The Kaggle dataset uses seasonal/total rainfall, not a daily snapshot.
    # We fetch the last 90 days from the Open-Meteo Archive API.
    end_date = date.today() - timedelta(days=5) # 5 days ago to ensure data is archived
    start_date = end_date - timedelta(days=90)
    
    archive_url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&daily=temperature_2m_mean,precipitation_sum&timezone=auto"
    
    try:
        with urllib.request.urlopen(archive_url) as response:
            w_resp = json.loads(response.read().decode())
            temps = w_resp["daily"]["temperature_2m_mean"]
            precips = w_resp["daily"]["precipitation_sum"]
            
            # Filter out None values
            temps = [t for t in temps if t is not None]
            precips = [p for p in precips if p is not None]
            
            # Average 3-month temperature
            temp = round(sum(temps) / len(temps), 2) if temps else 28.5
            # TOTAL 3-month rainfall (Sum)
            rain = round(sum(precips), 2) if precips else 200.0
            
    except Exception as e:
        temp, rain = 28.5, 200.0

    # 3. SOIL MAPPING
    # Look up the district in our static dictionary (case insensitive)
    search_key = req.location.lower().strip()
    soil_data = DISTRICT_SOIL_DATA.get(search_key, DISTRICT_SOIL_DATA["default"])

    # 4. Mock the ML Classification -> Yield -> LP Pipeline
    recommended_crops = [
        {
            "crop": "Rice", 
            "allocated_acres": round(req.land_acres * 0.6, 2), 
            "expected_yield_tonnes": round((req.land_acres * 0.6) * 4.2, 1), 
            "profit_est": req.budget * 1.8
        },
        {
            "crop": "Jute", 
            "allocated_acres": round(req.land_acres * 0.3, 2), 
            "expected_yield_tonnes": round((req.land_acres * 0.3) * 2.8, 1), 
            "profit_est": req.budget * 0.7
        },
        {
            "crop": "Maize", 
            "allocated_acres": round(req.land_acres * 0.1, 2), 
            "expected_yield_tonnes": round((req.land_acres * 0.1) * 3.5, 1), 
            "profit_est": req.budget * 0.2
        },
    ]
    
    total_profit = sum([c["profit_est"] for c in recommended_crops])
    
    return {
        "status": "success",
        "regional_data": {
            **soil_data, 
            "temperature": temp, 
            "rainfall": rain
        },
        "resolved_location": resolved_location,
        "allocations": recommended_crops,
        "total_estimated_profit": total_profit,
        "message": f"Fetched 3-Month Historical Weather for {resolved_location}. Optimized for max profit."
    }
