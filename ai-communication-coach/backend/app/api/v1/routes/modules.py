from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.module import Module
from app.models.user import User
from app.schemas.module import ModuleResponse, SubmoduleItem

router = APIRouter()

TOPIC_SUGGESTIONS: dict[str, list[str]] = {
    "Group Discussion": [
        "Should AI replace human teachers in education?",
        "Impact of social media on mental health among youth",
        "Is remote work the future of employment?",
        "Climate change: individual vs corporate responsibility",
        "The ethics of genetic engineering in humans",
    ],
    "Debate": [
        "Technology is making us more isolated than connected",
        "Universal Basic Income should be implemented globally",
        "Privacy vs security in the digital age",
        "Space exploration is a waste of resources",
        "Social media companies should be held liable for misinformation",
    ],
    "Presentation": [
        "The future of AI in healthcare and medicine",
        "How to build an effective leadership pipeline",
        "Sustainable business practices for the 2020s",
        "The evolution of customer experience in the digital era",
        "Leveraging data analytics for strategic decision making",
    ],
    "JAM": [
        "The color blue",
        "If I could time travel",
        "The importance of failure in life",
        "My favorite invention of all time",
        "What makes a great leader",
    ],
    "Interview": [
        "Tell me about a time you handled conflict at work",
        "Describe your greatest professional achievement",
        "How do you handle tight deadlines and pressure?",
        "Where do you see yourself in 5 years?",
        "Walk me through a project you led from start to finish",
    ],
}


@router.get("", response_model=list[ModuleResponse])
async def get_modules(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Module).order_by(Module.name.asc()))
    modules = result.scalars().all()

    return [
        ModuleResponse(
            id=str(module.id),
            name=module.name,
            description=module.description,
            submodules=[SubmoduleItem(**submodule) for submodule in module.submodules],
        )
        for module in modules
    ]


@router.get("/topics/{module_name}")
async def get_topic_suggestions(
    module_name: str,
    _: User = Depends(get_current_user),
):
    suggestions = TOPIC_SUGGESTIONS.get(module_name, TOPIC_SUGGESTIONS.get("Group Discussion", []))
    return {"module_name": module_name, "suggestions": suggestions}
