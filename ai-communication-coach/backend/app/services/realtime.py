"""
Socket.IO real-time event handlers.

Events:
  connect/disconnect — lifecycle
  join_session       — enter a session room for live events
  transcript_chunk   — user sends speech text; triggers live analysis + feedback
"""

from collections import defaultdict

import socketio

from app.services.ai_pipeline.analyzer import analyze_transcript, extract_metrics

session_buffers: defaultdict[str, list[str]] = defaultdict(list)
_MAX_BUFFER_CHUNKS = 100  # Cap per-session buffer to prevent unbounded growth

# Track which sessions each SID has joined for cleanup
_sid_sessions: defaultdict[str, set[str]] = defaultdict(set)


def register_socket_handlers(sio: socketio.AsyncServer) -> None:
    @sio.event
    async def connect(sid, environ):
        await sio.emit("connected", {"sid": sid}, to=sid)

    @sio.event
    async def disconnect(sid):
        # Clean up session buffers for sessions this SID joined
        joined = _sid_sessions.pop(sid, set())
        for session_id in joined:
            # Only clean up if no other SIDs are in the room
            room_members = sio.manager.get_participants("/", session_id)
            # If the room is empty after this disconnect, clean buffer
            remaining = [s for s in room_members if s != sid]
            if not remaining:
                session_buffers.pop(session_id, None)
        return sid

    @sio.event
    async def join_session(sid, data):
        session_id = data.get("session_id", "")
        if not session_id:
            await sio.emit("error", {"message": "session_id is required"}, to=sid)
            return

        await sio.enter_room(sid, session_id)
        _sid_sessions[sid].add(session_id)
        await sio.emit("joined_session", {"session_id": session_id}, room=session_id)

    @sio.event
    async def leave_session(sid, data):
        session_id = data.get("session_id", "")
        if not session_id:
            return

        await sio.leave_room(sid, session_id)
        if session_id in _sid_sessions.get(sid, set()):
            _sid_sessions[sid].remove(session_id)

        # Clean up if room is empty
        room_members = sio.manager.get_participants("/", session_id)
        remaining = [s for s in room_members if s != sid]
        if not remaining:
            session_buffers.pop(session_id, None)

    @sio.event
    async def transcript_chunk(sid, data):
        session_id = data.get("session_id", "")
        content = data.get("content", "").strip()
        if not session_id or not content:
            return

        session_buffers[session_id].append(content)
        # Cap buffer size to prevent memory growth on long sessions
        if len(session_buffers[session_id]) > _MAX_BUFFER_CHUNKS:
            session_buffers[session_id] = session_buffers[session_id][-_MAX_BUFFER_CHUNKS:]
        # Use the last 10 chunks for rolling context analysis
        merged = " ".join(session_buffers[session_id][-10:])
        analysis = analyze_transcript(merged)
        metrics = extract_metrics(merged)

        # Build contextual tip based on score profile
        quick_tips = []
        if analysis.clarity_score < 65:
            quick_tips.append("Structure your points: opening statement, evidence, conclusion")
        if analysis.confidence_score < 65:
            quick_tips.append("Reduce filler words — pause silently instead of saying 'um'")
        if analysis.content_score < 65:
            quick_tips.append("Add a specific example or data point to strengthen your argument")
        if analysis.delivery_score < 65:
            quick_tips.append("Aim for 12-18 words per sentence for optimal delivery rhythm")

        if metrics.filler_count > 3:
            quick_tips.append(f"Filler alert: {metrics.filler_count} fillers detected — try conscious pausing")
        if metrics.transition_count >= 3:
            quick_tips.append("Good logical flow! Your transitions are helping the audience follow along")

        # Fall back to general tips
        if not quick_tips:
            if analysis.overall_score >= 75:
                quick_tips.append("Excellent work! Try increasing complexity or introducing counterarguments")
            else:
                quick_tips.append("Good effort — keep speaking and I'll track your improvements in real-time")

        # Determine best tip
        best_tip = analysis.improvements[0] if analysis.improvements else quick_tips[0]

        await sio.emit(
            "live_feedback",
            {
                "session_id": session_id,
                "quick_tip": best_tip,
                "all_tips": quick_tips[:3],
                "confidence_score": analysis.confidence_score,
                "clarity_score": analysis.clarity_score,
                "content_score": analysis.content_score,
                "delivery_score": analysis.delivery_score,
                "overall_score": analysis.overall_score,
                "word_count": metrics.word_count,
                "filler_count": metrics.filler_count,
            },
            room=session_id,
        )
