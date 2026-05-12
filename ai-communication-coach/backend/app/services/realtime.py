"""
Socket.IO real-time event handlers.

Events:
  ── Lifecycle ──
  connect/disconnect

  ── Solo Sessions ──
  join_session       — enter a solo session room
  leave_session      — leave a solo session room
  transcript_chunk   — speech text from solo session
  vision_metrics     — face landmarks from MediaPipe (solo)
  voice_metrics      — audio features from Web Audio API (solo)

  ── Room Sessions (Multi-user) ──
  join_room          — enter a multi-user room
  leave_room         — leave a multi-user room
  room_ready         — host starts the room session

  ── WebRTC Signaling ──
  webrtc_offer       — SDP offer to a specific peer
  webrtc_answer      — SDP answer to a specific peer
  webrtc_ice         — ICE candidate to a specific peer

  ── Per-User Room Metrics ──
  room_transcript    — speech text from a specific user in a room
  room_vision        — face metrics from a specific user in a room
  room_voice         — voice metrics from a specific user in a room
"""

from collections import defaultdict

import socketio

from app.services.ai_pipeline.analyzer import analyze_transcript, extract_metrics
from app.services.ai_pipeline.vision_analyzer import (
    SessionVisionBuffer,
    SessionVoiceBuffer,
    compute_vision_metrics,
    compute_voice_metrics,
)
from app.services.ai_pipeline.multimodal_fusion import fuse_scores, result_to_dict
from app.services.ai_pipeline.room_analyzer import (
    process_room_transcript,
    process_room_vision,
    process_room_voice,
    get_all_participant_multimodal,
    get_room_state,
    cleanup_room_state,
)

# ── Solo session state ─────────────────────────────────────────────────
session_buffers: defaultdict[str, list[str]] = defaultdict(list)
_MAX_BUFFER_CHUNKS = 100

_sid_sessions: defaultdict[str, set[str]] = defaultdict(set)
_vision_buffers: defaultdict[str, SessionVisionBuffer] = defaultdict(SessionVisionBuffer)
_voice_buffers: defaultdict[str, SessionVoiceBuffer] = defaultdict(SessionVoiceBuffer)
_content_scores: defaultdict[str, float] = defaultdict(lambda: 50.0)
_latest_multimodal: dict[str, dict] = {}

# ── Room state ─────────────────────────────────────────────────────────
# room_id → set of SIDs in the room
_room_members: defaultdict[str, dict[str, dict]] = defaultdict(dict)  # room_id → {sid: {user_id, display_name}}
_sid_rooms: defaultdict[str, set[str]] = defaultdict(set)  # sid → set of room_ids


def get_latest_multimodal(session_id: str) -> dict | None:
    """Retrieve the latest multimodal result for a solo session."""
    return _latest_multimodal.get(session_id)


def register_socket_handlers(sio: socketio.AsyncServer) -> None:

    # ═══════════════════════════════════════════════════════════════════
    # LIFECYCLE
    # ═══════════════════════════════════════════════════════════════════

    @sio.event
    async def connect(sid, environ):
        await sio.emit("connected", {"sid": sid}, to=sid)

    @sio.event
    async def disconnect(sid):
        # Clean solo sessions
        joined = _sid_sessions.pop(sid, set())
        for session_id in joined:
            room_members = sio.manager.get_participants("/", session_id)
            remaining = [s for s in room_members if s != sid]
            if not remaining:
                session_buffers.pop(session_id, None)
                _vision_buffers.pop(session_id, None)
                _voice_buffers.pop(session_id, None)
                _content_scores.pop(session_id, None)
                _latest_multimodal.pop(session_id, None)

        # Clean room sessions
        rooms = _sid_rooms.pop(sid, set())
        for room_id in rooms:
            member_info = _room_members[room_id].pop(sid, None)
            if member_info:
                await sio.emit("room_peer_left", {
                    "sid": sid,
                    "user_id": member_info.get("user_id", ""),
                    "display_name": member_info.get("display_name", ""),
                }, room=f"room_{room_id}")
            await sio.leave_room(sid, f"room_{room_id}")
            if not _room_members[room_id]:
                _room_members.pop(room_id, None)
                cleanup_room_state(room_id)

    # ═══════════════════════════════════════════════════════════════════
    # SOLO SESSION EVENTS (unchanged from previous implementation)
    # ═══════════════════════════════════════════════════════════════════

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
        room_members = sio.manager.get_participants("/", session_id)
        remaining = [s for s in room_members if s != sid]
        if not remaining:
            session_buffers.pop(session_id, None)
            _vision_buffers.pop(session_id, None)
            _voice_buffers.pop(session_id, None)
            _content_scores.pop(session_id, None)
            _latest_multimodal.pop(session_id, None)

    @sio.event
    async def transcript_chunk(sid, data):
        session_id = data.get("session_id", "")
        content = data.get("content", "").strip()
        if not session_id or not content:
            return

        session_buffers[session_id].append(content)
        if len(session_buffers[session_id]) > _MAX_BUFFER_CHUNKS:
            session_buffers[session_id] = session_buffers[session_id][-_MAX_BUFFER_CHUNKS:]
        merged = " ".join(session_buffers[session_id][-10:])
        analysis = analyze_transcript(merged)
        metrics = extract_metrics(merged)

        _content_scores[session_id] = analysis.overall_score

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
        if not quick_tips:
            if analysis.overall_score >= 75:
                quick_tips.append("Excellent work! Try increasing complexity or introducing counterarguments")
            else:
                quick_tips.append("Good effort — keep speaking and I'll track your improvements in real-time")

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
        await _emit_multimodal_update(sio, session_id)

    @sio.event
    async def vision_metrics(sid, data):
        session_id = data.get("session_id", "")
        if not session_id:
            return
        frame = {
            "eye_yaw": float(data.get("eye_yaw", 0.0)),
            "eye_pitch": float(data.get("eye_pitch", 0.0)),
            "head_yaw": float(data.get("head_yaw", 0.0)),
            "head_pitch": float(data.get("head_pitch", 0.0)),
            "head_roll": float(data.get("head_roll", 0.0)),
            "smile_prob": float(data.get("smile_prob", 0.5)),
            "brow_inner_up": float(data.get("brow_inner_up", 0.0)),
        }
        _vision_buffers[session_id].frames.append(frame)
        if len(_vision_buffers[session_id].frames) % 3 == 0:
            await _emit_multimodal_update(sio, session_id)

    @sio.event
    async def voice_metrics(sid, data):
        session_id = data.get("session_id", "")
        if not session_id:
            return
        frame = {
            "rms_energy": float(data.get("rms_energy", 0.02)),
            "pitch_hz": float(data.get("pitch_hz", 150.0)),
            "speech_rate_wpm": float(data.get("speech_rate_wpm", 140.0)),
            "pause_ratio": float(data.get("pause_ratio", 0.3)),
        }
        _voice_buffers[session_id].frames.append(frame)

    async def _emit_multimodal_update(server, session_id):
        vision_buf = _vision_buffers.get(session_id)
        voice_buf = _voice_buffers.get(session_id)
        content = _content_scores.get(session_id, 50.0)
        vision = compute_vision_metrics(vision_buf) if vision_buf and len(vision_buf.frames) > 0 else None
        voice = compute_voice_metrics(voice_buf) if voice_buf and len(voice_buf.frames) > 0 else None
        result = fuse_scores(vision, voice, content)
        payload = result_to_dict(result)
        payload["session_id"] = session_id
        _latest_multimodal[session_id] = payload
        await server.emit("multimodal_update", payload, room=session_id)

    # ═══════════════════════════════════════════════════════════════════
    # ROOM EVENTS (Multi-user)
    # ═══════════════════════════════════════════════════════════════════

    @sio.event
    async def join_room(sid, data):
        room_id = data.get("room_id", "")
        user_id = data.get("user_id", "")
        display_name = data.get("display_name", "Guest")
        team = data.get("team", "")
        if not room_id:
            await sio.emit("error", {"message": "room_id is required"}, to=sid)
            return

        room_key = f"room_{room_id}"
        await sio.enter_room(sid, room_key)
        _sid_rooms[sid].add(room_id)

        # Store member info
        _room_members[room_id][sid] = {
            "user_id": user_id,
            "display_name": display_name,
            "sid": sid,
        }

        # Initialize participant in room analyzer
        state = get_room_state(room_id)
        state.get_or_create_participant(user_id, display_name, team)

        # Notify all peers in the room about the new joiner
        # Send the new peer info to everyone else
        existing_peers = [
            info for other_sid, info in _room_members[room_id].items() if other_sid != sid
        ]
        await sio.emit("room_peer_joined", {
            "sid": sid,
            "user_id": user_id,
            "display_name": display_name,
            "existing_peers": existing_peers,
        }, room=room_key)

        # Send existing peers list to the new joiner
        await sio.emit("room_peers_list", {
            "room_id": room_id,
            "peers": [
                {**info, "sid": other_sid}
                for other_sid, info in _room_members[room_id].items()
                if other_sid != sid
            ],
        }, to=sid)

    @sio.event
    async def leave_room(sid, data):
        room_id = data.get("room_id", "")
        if not room_id:
            return

        room_key = f"room_{room_id}"
        member_info = _room_members[room_id].pop(sid, None)
        await sio.leave_room(sid, room_key)

        if room_id in _sid_rooms.get(sid, set()):
            _sid_rooms[sid].remove(room_id)

        if member_info:
            await sio.emit("room_peer_left", {
                "sid": sid,
                "user_id": member_info.get("user_id", ""),
                "display_name": member_info.get("display_name", ""),
            }, room=room_key)

        if not _room_members[room_id]:
            _room_members.pop(room_id, None)
            cleanup_room_state(room_id)

    @sio.event
    async def room_ready(sid, data):
        """Host signals that the room session has started."""
        room_id = data.get("room_id", "")
        if not room_id:
            return
        await sio.emit("room_session_started", {"room_id": room_id}, room=f"room_{room_id}")

    # ═══════════════════════════════════════════════════════════════════
    # WebRTC SIGNALING
    # ═══════════════════════════════════════════════════════════════════

    @sio.event
    async def webrtc_offer(sid, data):
        target_sid = data.get("target_sid", "")
        if not target_sid:
            return
        await sio.emit("webrtc_offer", {
            "from_sid": sid,
            "sdp": data.get("sdp", ""),
            "user_id": data.get("user_id", ""),
            "display_name": data.get("display_name", ""),
        }, to=target_sid)

    @sio.event
    async def webrtc_answer(sid, data):
        target_sid = data.get("target_sid", "")
        if not target_sid:
            return
        await sio.emit("webrtc_answer", {
            "from_sid": sid,
            "sdp": data.get("sdp", ""),
        }, to=target_sid)

    @sio.event
    async def webrtc_ice(sid, data):
        target_sid = data.get("target_sid", "")
        if not target_sid:
            return
        await sio.emit("webrtc_ice", {
            "from_sid": sid,
            "candidate": data.get("candidate", {}),
        }, to=target_sid)

    # ═══════════════════════════════════════════════════════════════════
    # PER-USER ROOM METRICS
    # ═══════════════════════════════════════════════════════════════════

    @sio.event
    async def room_transcript(sid, data):
        room_id = data.get("room_id", "")
        user_id = data.get("user_id", "")
        content = data.get("content", "").strip()
        display_name = data.get("display_name", "")
        team = data.get("team", "")
        if not room_id or not user_id or not content:
            return

        feedback = process_room_transcript(room_id, user_id, content, display_name, team)
        feedback["room_id"] = room_id

        # Emit individual feedback to the room
        await sio.emit("room_live_feedback", feedback, room=f"room_{room_id}")

        # Periodically emit room-wide multimodal update
        state = get_room_state(room_id)
        total_chunks = sum(len(p.transcript_chunks) for p in state.participants.values())
        if total_chunks % 5 == 0:
            all_results = get_all_participant_multimodal(room_id)
            await sio.emit("room_multimodal_update", {
                "room_id": room_id,
                "participants": all_results,
            }, room=f"room_{room_id}")

    @sio.event
    async def room_vision(sid, data):
        room_id = data.get("room_id", "")
        user_id = data.get("user_id", "")
        if not room_id or not user_id:
            return
        frame = {
            "eye_yaw": float(data.get("eye_yaw", 0.0)),
            "eye_pitch": float(data.get("eye_pitch", 0.0)),
            "head_yaw": float(data.get("head_yaw", 0.0)),
            "head_pitch": float(data.get("head_pitch", 0.0)),
            "head_roll": float(data.get("head_roll", 0.0)),
            "smile_prob": float(data.get("smile_prob", 0.5)),
            "brow_inner_up": float(data.get("brow_inner_up", 0.0)),
        }
        process_room_vision(room_id, user_id, frame)

    @sio.event
    async def room_voice(sid, data):
        room_id = data.get("room_id", "")
        user_id = data.get("user_id", "")
        if not room_id or not user_id:
            return
        frame = {
            "rms_energy": float(data.get("rms_energy", 0.02)),
            "pitch_hz": float(data.get("pitch_hz", 150.0)),
            "speech_rate_wpm": float(data.get("speech_rate_wpm", 140.0)),
            "pause_ratio": float(data.get("pause_ratio", 0.3)),
        }
        process_room_voice(room_id, user_id, frame)
