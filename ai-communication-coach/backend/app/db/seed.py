from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.module import Module

MODULES = {
    "Group Discussion": "Master collaborative communication. Practice articulating ideas, building on others' points, and managing turn-taking in group settings.",
    "Debate": "Sharpen argumentation and persuasion skills. Build logical arguments, deliver powerful rebuttals, and defend positions under pressure.",
    "Presentation": "Develop confident presentation delivery. Structure compelling narratives, engage audiences, and communicate complex ideas clearly.",
    "JAM": "Just A Minute — the ultimate fluency challenge. Speak on a random topic for 60 seconds without hesitation, repetition, or deviation.",
    "Interview": "Prepare for high-stakes interviews. Practice behavioral, technical, and situational questions with AI-powered evaluation and coaching.",
}

SUBMODULES = [
    {"name": "Demo Mode", "description": "Watch AI-generated examples and learn optimal techniques."},
    {"name": "Personal Practice", "description": "Solo practice with full AI analysis and personalized feedback."},
    {"name": "AI Mode", "description": "Interactive sessions with AI avatar coach for real-time conversation."},
    {"name": "Friends Mode", "description": "Multi-user sessions with AI observer for comparative analysis."},
]


async def seed_modules() -> None:
    async with SessionLocal() as db:
        result = await db.execute(select(Module.id).limit(1))
        if result.first():
            return

        for module_name, description in MODULES.items():
            module = Module(name=module_name, description=description)
            module.submodules = [
                {"name": sub["name"], "description": f"{sub['description']} ({module_name})"}
                for sub in SUBMODULES
            ]
            db.add(module)

        await db.commit()
