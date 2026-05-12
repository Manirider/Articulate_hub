import string
import random
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List

from app.api.v1.routes.auth import get_current_user
from app.core.dependencies import get_db
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.user import User
from app.models.session import Session as AppSession
from app.models.performance_history import PerformanceHistory
from app.models.vision_score import VisionScore
from app.schemas.team import TeamCreate, TeamResponse, TeamJoin, TeamAnalytics, TeamMemberAnalytics

router = APIRouter(tags=["teams"])

def generate_invite_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(team: TeamCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_team = Team(
        name=team.name,
        description=team.description,
        invite_code=generate_invite_code()
    )
    db.add(db_team)
    await db.flush() # get id
    
    manager = TeamMember(
        team_id=db_team.id,
        user_id=current_user.id,
        role="manager"
    )
    db.add(manager)
    await db.commit()
    await db.refresh(db_team)
    
    # Reload with relationships
    result = await db.execute(
        select(Team)
        .where(Team.id == db_team.id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    db_team = result.scalar_one()
    
    for member in db_team.members:
        if member.user:
            member.user_name = member.user.full_name
            member.user_email = member.user.email
            
    return db_team

@router.get("", response_model=List[TeamResponse])
async def get_user_teams(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Team)
        .join(Team.members)
        .where(TeamMember.user_id == current_user.id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    teams = result.scalars().unique().all()
    
    # Populate user info for members
    for team in teams:
        for member in team.members:
            if member.user:
                member.user_name = member.user.full_name
                member.user_email = member.user.email
    return teams

@router.post("/join", response_model=TeamResponse)
async def join_team(join_req: TeamJoin, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Team)
        .where(Team.invite_code == join_req.invite_code)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    team = result.scalar_one_or_none()
    
    if not team:
        raise HTTPException(status_code=404, detail="Invalid invite code or team not found")
        
    result_existing = await db.execute(
        select(TeamMember)
        .where(
            TeamMember.team_id == team.id,
            TeamMember.user_id == current_user.id
        )
    )
    existing = result_existing.scalar_one_or_none()
    
    if existing:
        for member in team.members:
            if member.user:
                member.user_name = member.user.full_name
                member.user_email = member.user.email
        return team
        
    member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role="member"
    )
    db.add(member)
    await db.commit()
    
    # Reload team to get the new member
    result = await db.execute(
        select(Team)
        .where(Team.id == team.id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    team = result.scalar_one()
    
    for member in team.members:
        if member.user:
            member.user_name = member.user.full_name
            member.user_email = member.user.email
    return team

@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(team_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Team)
        .where(Team.id == team_id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    team = result.scalar_one_or_none()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    # Check access
    result_access = await db.execute(
        select(TeamMember)
        .where(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id)
    )
    access = result_access.scalar_one_or_none()
    
    if not access:
        raise HTTPException(status_code=403, detail="Not a member of this team")
        
    for member in team.members:
        if member.user:
            member.user_name = member.user.full_name
            member.user_email = member.user.email
    return team

@router.get("/{team_id}/analytics", response_model=TeamAnalytics)
async def get_team_analytics(team_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Team)
        .where(Team.id == team_id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    # Only managers can view full analytics in this version
    result_access = await db.execute(
        select(TeamMember)
        .where(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id)
    )
    access = result_access.scalar_one_or_none()
    
    if not access or access.role != "manager":
        raise HTTPException(status_code=403, detail="Manager access required to view analytics")
        
    total_score, total_clarity, total_confidence, total_pacing, total_vision = 0, 0, 0, 0, 0
    sessions_count = 0
    
    member_analytics_list = []
    
    # Extract all user IDs for bulk querying
    user_ids = [member.user_id for member in team.members]
    
    # Bulk query performance history and vision scores for all team members at once (fixes N+1 issue)
    result_history = await db.execute(
        select(PerformanceHistory, VisionScore.face_score)
        .outerjoin(VisionScore, VisionScore.session_id == PerformanceHistory.session_id)
        .where(PerformanceHistory.user_id.in_(user_ids))
    )
    all_history_rows = result_history.all()
    
    # Group histories by user_id
    history_by_user = {uid: [] for uid in user_ids}
    for history, face_score in all_history_rows:
        history_by_user[history.user_id].append((history, face_score))
    
    for member in team.members:
        member_sessions = 0
        member_total_score = 0
        
        history_rows = history_by_user.get(member.user_id, [])
        
        for history, face_score in history_rows:
            total_score += history.overall_score
            member_total_score += history.overall_score
            total_clarity += history.clarity_score
            total_confidence += history.confidence_score
            total_pacing += history.delivery_score
            
            # Use real vision score if available, otherwise default to a reasonable baseline
            # face_score from VisionScore is a 0-100 metric
            current_vision = face_score if face_score is not None else 80.0
            total_vision += current_vision
            
            sessions_count += 1
            member_sessions += 1
                
        user_name = member.user.full_name if member.user else "Unknown User"
        user_email = member.user.email if member.user else ""
        
        member_analytics_list.append(TeamMemberAnalytics(
            user_id=member.user_id,
            user_name=user_name,
            user_email=user_email,
            role=member.role,
            joined_at=member.joined_at,
            sessions_count=member_sessions,
            average_score=(member_total_score / member_sessions) if member_sessions > 0 else None
        ))
                
    if sessions_count > 0:
        avg_s = total_score / sessions_count
        avg_cl = total_clarity / sessions_count
        avg_co = total_confidence / sessions_count
        avg_pa = total_pacing / sessions_count
        avg_vi = total_vision / sessions_count
    else:
        avg_s = avg_cl = avg_co = avg_pa = avg_vi = 0.0
        
    return TeamAnalytics(
        average_score=avg_s,
        average_clarity=avg_cl,
        average_confidence=avg_co,
        average_pacing=avg_pa,
        average_vision=avg_vi,
        total_sessions=sessions_count,
        member_count=len(team.members),
        members=member_analytics_list
    )
