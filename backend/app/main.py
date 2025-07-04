from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="MTGA Analyzer API")

# This is the list of allowed "origins" (your frontend)
origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Allow cookies/auth headers if needed
    allow_methods=["*"], # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"], # Allow any custom headers (e.g. Content-Type, Authorization)
)

@app.get("/")
def read_root():
    return {"message": "Hello from the MTGA Analyzer Backend!"}