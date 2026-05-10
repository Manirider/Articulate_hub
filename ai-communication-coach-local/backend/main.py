import os
import shutil
import cv2
import requests
import numpy as np
import time
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, AsyncGenerator

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import uvicorn
from faster_whisper import WhisperModel
from passlib.context import CryptContext
from jose import JWTError, jwt

from database import engine, Base, SessionLocal, User, Session, Transcript, Feedback, Score, UserProgress, UserStats, Achievement, UserAchievement

# Security Constants - Load from environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-keep-safe-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

app = FastAPI(title="AI Communication Coach API")

os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ... [Keep seed_achievements, verify_password, get_current_user, register, login, etc. identical for brevity] ...
# (I will include the full code to avoid breaking it)
def seed_achievements():
    db = SessionLocal()
    achievements = [
        {"name": "First Steps", "description": "Complete your first session.", "condition": "session_count >= 1"},
        {"name": "Consistency is Key", "description": "Reach a 5-day streak.", "condition": "streak >= 5"},
        {"name": "Master Orator", "description": "Get a perfect score (10/10) on any metric.", "condition": "max_score == 100"},
        {"name": "Dedicated Learner", "description": "Complete 10 sessions.", "condition": "session_count >= 10"}
    ]
    for ach in achievements:
        if not db.query(Achievement).filter(Achievement.name == ach["name"]).first():
            db.add(Achievement(**ach))
    db.commit()
    db.close()

try:
    Base.metadata.create_all(bind=engine)
    print("Database connected and schema initialized.")
    seed_achievements()
except Exception as e:
    print("Warning: Could not connect to PostgreSQL. Is Docker running?", e)

print("Loading Whisper Model...")
whisper_model = WhisperModel("base", device="cpu", compute_type="int8")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise credentials_exception
    except JWTError: raise credentials_exception
        
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user is None: raise credentials_exception
        return user
    finally:
        db.close()

class UserCreate(BaseModel):
    username: str
    password: str
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not v.username or len(v.username) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if len(v.username) > 50:
            raise ValueError('Username must be at most 50 characters long')
        if not v.password or len(v.password) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v.password) > 128:
            raise ValueError('Password must be at most 128 characters long')
        # Check for at least one uppercase, one lowercase, one digit
        if not any(c.isupper() for c in v.password):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v.password):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v.password):
            raise ValueError('Password must contain at least one digit')
        return v

@app.post("/api/register")
def register(user: UserCreate):
    db = SessionLocal()
    try:
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user: raise HTTPException(status_code=400, detail="Username already registered")
        
        hashed_pw = get_password_hash(user.password)
        new_user = User(username=user.username, hashed_password=hashed_pw)
        db.add(new_user)
        db.commit()
        return {"message": "User created successfully"}
    finally:
        db.close()

@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == form_data.username).first()
        if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect username or password")
            
        access_token = create_access_token(data={"sub": user.username}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        return {"access_token": access_token, "token_type": "bearer", "username": user.username}
    finally:
        db.close()

def generate_evaluation_prompt(transcript: str, module_type: str = "general", focus_score: float = 0.0) -> str:
    return f"""
You are an expert Staff+ FAANG Interviewer and Communication Coach. 
Analyze the following user transcript from a "{module_type}" module.
TRANSCRIPT: "{transcript}"
EYE CONTACT / FOCUS SCORE: {focus_score:.1f}% (A measure of how consistently they looked at the camera).

Provide a professional evaluation matching this EXACT JSON structure. DO NOT include markdown formatting or backticks around the JSON. Only return the raw JSON object.
{{
    "scores": {{ "confidence": <int 1-10 based on filler words and focus score>, "clarity": <int 1-10 based on grammar>, "content": <int 1-10 based on depth>, "delivery": <int 1-10 based on pacing> }},
    "strengths": "<1-2 sentences of what they did well>",
    "weaknesses": "<1-2 sentences of what needs improvement>",
    "suggestions": "<1-2 actionable tips>",
    "summary": "<Short friendly summary.>"
}}
"""

def generate_coach_prompt(history_text: str) -> str:
    return f"""
You are a Personal AI Communication Coach.
Analyze the user's recent progress and trend data:
{history_text}
Provide highly personalized advice in EXACT JSON structure. DO NOT include markdown formatting or backticks around the JSON. Only return the raw JSON object.
{{
    "trend_analysis": "<1-2 sentences about their overall improvement or decline>",
    "weak_area_focus": "<1 sentence on what specific weak area they keep repeating>",
    "daily_tip": "<1 actionable daily exercise to fix the weak area>",
    "module_recommendation": "<Which module should they practice next and why?>"
}}
"""

def calculate_level(xp: int) -> str:
    if xp < 100: return "Beginner"
    if xp < 300: return "Intermediate"
    if xp < 700: return "Advanced"
    return "Pro"

def check_unlock_achievements(db, user_id: int):
    session_count = db.query(Session).filter(Session.user_id == user_id).count()
    stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
    max_score = 0
    scores = db.query(Score).join(Session).filter(Session.user_id == user_id).all()
    for s in scores:
        max_score = max(max_score, s.confidence_score, s.clarity_score, s.content_score, s.delivery_score)
    
    unlocked = []
    achievements = db.query(Achievement).all()
    user_achs = [ua.achievement_id for ua in db.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()]
    
    for ach in achievements:
        if ach.id in user_achs: continue
        condition_met = False
        if ach.name == "First Steps" and session_count >= 1: condition_met = True
        elif ach.name == "Consistency is Key" and stats and stats.current_streak >= 5: condition_met = True
        elif ach.name == "Master Orator" and max_score >= 100: condition_met = True
        elif ach.name == "Dedicated Learner" and session_count >= 10: condition_met = True
        
        if condition_met:
            db.add(UserAchievement(user_id=user_id, achievement_id=ach.id))
            unlocked.append(ach.name)
            
    if unlocked: db.commit()
    return unlocked

# --- NEW: STEP 1: TRANSCRIBE ---
@app.post("/api/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    temp_file = f"temp_{current_user.username}_{int(time.time())}.webm"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
        
    try:
        segments, info = whisper_model.transcribe(temp_file, beam_size=5)
        transcript = " ".join([segment.text for segment in segments]).strip()
        if not transcript:
            raise HTTPException(status_code=400, detail="Could not transcribe audio.")
        return {"transcript": transcript}
    finally:
        if os.path.exists(temp_file): os.remove(temp_file)

class EvalRequest(BaseModel):
    transcript: str
    module_type: str = "general"
    focus_score: float = 0.0

# --- NEW: STEP 2: STREAMING EVALUATION ---
@app.post("/api/evaluate-stream")
async def evaluate_stream(
    req: EvalRequest,
    current_user: User = Depends(get_current_user)
):
    prompt = generate_evaluation_prompt(req.transcript, req.module_type, req.focus_score)
    
    async def event_generator() -> AsyncGenerator[str, None]:
        full_response = ""
        try:
            # Connect to Ollama with stream=True
            response = requests.post(f"{OLLAMA_URL}/api/generate", json={
                "model": "llama3",
                "prompt": prompt,
                "stream": True,
                "format": "json"
            }, stream=True, timeout=60)
            
            for line in response.iter_lines():
                if line:
                    chunk = json.loads(line).get("response", "")
                    full_response += chunk
                    # Send chunk directly to client in Server-Sent Event format
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                    
            # Once stream is finished, parse the full_response and save to DB
            yield f"data: {json.dumps({'status': 'saving_db'})}\n\n"
            try:
                ai_data = json.loads(full_response)
                save_session_data(current_user.id, req.transcript, ai_data)
                yield f"data: {json.dumps({'status': 'complete'})}\n\n"
            except Exception as e:
                print("Failed to save final JSON:", e)
                yield f"data: {json.dumps({'status': 'error_saving'})}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

def save_session_data(user_id: int, transcript: str, ai_data: dict):
    db = SessionLocal()
    try:
        new_session = Session(user_id=user_id)
        db.add(new_session)
        db.commit()
        db.refresh(new_session)

        db.add(Transcript(session_id=new_session.id, text=transcript))
        full_fb = f"Strengths: {ai_data.get('strengths')} Weaknesses: {ai_data.get('weaknesses')} Suggestions: {ai_data.get('suggestions')}"
        db.add(Feedback(session_id=new_session.id, ai_response=full_fb))
        
        scores = ai_data.get("scores", {})
        conf_score = scores.get("confidence", 5) * 10
        clar_score = scores.get("clarity", 5) * 10
        cont_score = scores.get("content", 5) * 10
        deli_score = scores.get("delivery", 5) * 10
        overall = (conf_score + clar_score + cont_score + deli_score) / 4.0
        
        db.add(Score(
            session_id=new_session.id, overall_score=overall, confidence_score=conf_score,
            clarity_score=clar_score, content_score=cont_score, delivery_score=deli_score
        ))
        
        # GAMIFICATION
        stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
        if not stats:
            stats = UserStats(user_id=user_id)
            db.add(stats)
            db.commit()
            db.refresh(stats)
            
        today = datetime.utcnow().date()
        if stats.last_active_date:
            last_active = stats.last_active_date.date()
            if last_active == today - timedelta(days=1): stats.current_streak += 1 
            elif last_active < today - timedelta(days=1): stats.current_streak = 1 
        else: stats.current_streak = 1 
            
        stats.last_active_date = datetime.utcnow()
        stats.longest_streak = max(stats.longest_streak, stats.current_streak)
        
        xp_gained = 10
        if overall >= 80: xp_gained += 20
        if stats.current_streak > 1: xp_gained += 5 
        
        stats.total_xp += xp_gained
        stats.level = calculate_level(stats.total_xp)
        db.commit()
        
        # PROGRESS
        progress = db.query(UserProgress).filter(UserProgress.user_id == user_id).first()
        if not progress:
            progress = UserProgress(user_id=user_id)
            db.add(progress)
            db.commit()
            db.refresh(progress)

        recent_scores = db.query(Score).join(Session).filter(Session.user_id == user_id).order_by(Score.created_at.desc()).limit(5).all()
        if recent_scores:
            progress.avg_confidence = sum(s.confidence_score for s in recent_scores) / len(recent_scores)
            progress.avg_clarity = sum(s.clarity_score for s in recent_scores) / len(recent_scores)
            progress.avg_content = sum(s.content_score for s in recent_scores) / len(recent_scores)
            progress.avg_delivery = sum(s.delivery_score for s in recent_scores) / len(recent_scores)
            avgs = {"Confidence": progress.avg_confidence, "Clarity": progress.avg_clarity, "Content": progress.avg_content, "Delivery": progress.avg_delivery}
            sorted_avgs = sorted(avgs.items(), key=lambda item: item[1])
            progress.weak_areas = sorted_avgs[0][0] 
            progress.strong_areas = sorted_avgs[-1][0] 
        db.commit()

        check_unlock_achievements(db, user_id)
    finally:
        db.close()

# Keep Analytics & Stats API identical
@app.get("/api/user-stats")
def get_user_stats(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        stats = db.query(UserStats).filter(UserStats.user_id == current_user.id).first()
        achievements = db.query(Achievement).join(UserAchievement).filter(UserAchievement.user_id == current_user.id).all()
        return {
            "username": current_user.username,
            "total_xp": stats.total_xp if stats else 0, "level": stats.level if stats else "Beginner",
            "current_streak": stats.current_streak if stats else 0, "longest_streak": stats.longest_streak if stats else 0,
            "achievements": [{"name": a.name, "description": a.description} for a in achievements]
        }
    finally: db.close()

@app.get("/api/leaderboard")
def get_leaderboard(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        stats = db.query(UserStats).filter(UserStats.user_id == current_user.id).first()
        leaderboard = [
            {"username": "Alex_Speaker", "xp": 850, "level": "Pro"}, {"username": "Sarah_Communicate", "xp": 420, "level": "Advanced"},
            {"username": current_user.username, "xp": stats.total_xp if stats else 0, "level": stats.level if stats else "Beginner"}
        ]
        leaderboard.sort(key=lambda x: x["xp"], reverse=True)
        return {"leaderboard": leaderboard}
    finally: db.close()
        
@app.get("/api/user-progress")
def get_user_progress(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        progress = db.query(UserProgress).filter(UserProgress.user_id == current_user.id).first()
        recent_sessions = db.query(Session).filter(Session.user_id == current_user.id).order_by(Session.created_at.asc()).limit(10).all()
        chart_data = [{"name": f"S{i+1}", "overall": sc.overall_score, "confidence": sc.confidence_score, "clarity": sc.clarity_score} 
                      for i, s in enumerate(recent_sessions) if (sc := db.query(Score).filter(Score.session_id == s.id).first())]
        return {
            "averages": {"confidence": progress.avg_confidence if progress else 0, "clarity": progress.avg_clarity if progress else 0, "content": progress.avg_content if progress else 0, "delivery": progress.avg_delivery if progress else 0},
            "weak_areas": progress.weak_areas if progress else "None", "history": chart_data
        }
    finally: db.close()

@app.post("/api/ai-coach")
def get_ai_coach_advice(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        progress = db.query(UserProgress).filter(UserProgress.user_id == current_user.id).first()
        if not progress: return {"advice": {"trend_analysis": "Complete a session!", "weak_area_focus": "-", "daily_tip": "-", "module_recommendation": "Interview"}}
        prompt = generate_coach_prompt(f"Avg Confidence={progress.avg_confidence}. Weakness: {progress.weak_areas}.")
        response = requests.post(f"{OLLAMA_URL}/api/generate", json={"model": "llama3", "prompt": prompt, "stream": False, "format": "json"}, timeout=45)
        return {"advice": json.loads(response.json().get("response", "{}"))}
    except: return {"advice": {}}
    finally: db.close()

@app.get("/api/analytics")
def get_analytics(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        recent_sessions = db.query(Session).filter(Session.user_id == current_user.id).order_by(Session.created_at.desc()).limit(5).all()
        results = []
        for s in recent_sessions:
            t = db.query(Transcript).filter(Transcript.session_id == s.id).first()
            f = db.query(Feedback).filter(Feedback.session_id == s.id).first()
            sc = db.query(Score).filter(Score.session_id == s.id).first()
            if sc: results.append({"id": s.id, "date": s.created_at.isoformat(), "transcript": t.text if t else "", "feedback": f.ai_response if f else "", "overall_score": sc.overall_score, "scores": {"confidence": sc.confidence_score, "clarity": sc.clarity_score, "content": sc.content_score, "delivery": sc.delivery_score}})
        return {"sessions": results}
    finally: db.close()

if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
