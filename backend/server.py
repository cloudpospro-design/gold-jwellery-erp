from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Gold Jewellery ERP API", version="1.0.0")

# Create API router
api_router = APIRouter(prefix="/api")

# Import and include routers
from routes import auth_routes, user_routes, inventory_routes, sales_routes, purchase_routes, gst_routes

api_router.include_router(auth_routes.router)
api_router.include_router(user_routes.router)
api_router.include_router(inventory_routes.router)
api_router.include_router(sales_routes.router)
api_router.include_router(purchase_routes.router)
api_router.include_router(gst_routes.router)

@api_router.get("/")
async def root():
    return {"message": "Gold Jewellery ERP API", "version": "1.0.0"}

# Include main router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()