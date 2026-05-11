import pytest
from unittest.mock import AsyncMock, MagicMock, patch, ANY
import socketio
from app.services.realtime import register_socket_handlers

@pytest.fixture
def sio():
    server = socketio.AsyncServer(async_mode='asgi')
    register_socket_handlers(server)
    return server

@pytest.mark.asyncio
async def test_socket_lifecycle(sio):
    sid = "test_sid"
    environ = {"HTTP_HOST": "localhost"}
    
    # Mock emit and room management
    sio.emit = AsyncMock()
    sio.enter_room = AsyncMock()
    sio.leave_room = AsyncMock()
    
    # Test connect
    handler = sio.handlers["/"]["connect"]
    await handler(sid, environ)
    sio.emit.assert_called()
    
    # Test join session
    handler_join = sio.handlers["/"]["join_session"]
    await handler_join(sid, {"session_id": "cleanup_session"})
    sio.enter_room.assert_called_with(sid, "cleanup_session")
    
    # Test disconnect (cleanup)
    with patch.object(sio.manager, "get_participants", return_value=[]):
        handler_disc = sio.handlers["/"]["disconnect"]
        await handler_disc(sid)

@pytest.mark.asyncio
async def test_solo_session_flow(sio):
    sid = "sid_1"
    session_id = "session_123"
    sio.emit = AsyncMock()
    sio.enter_room = AsyncMock()
    sio.leave_room = AsyncMock()
    
    # Join
    handler = sio.handlers["/"]["join_session"]
    await handler(sid, {"session_id": session_id})
    sio.enter_room.assert_called_with(sid, session_id)
    
    # Error Join (no session_id)
    await handler(sid, {})
    sio.emit.assert_any_call("error", ANY, to=sid)
    
    # Leave
    handler_leave = sio.handlers["/"]["leave_session"]
    with patch.object(sio.manager, "get_participants", return_value=[]):
        await handler_leave(sid, {"session_id": session_id})
    sio.leave_room.assert_called_with(sid, session_id)
    
    # Transcript chunk
    with patch("app.services.realtime.analyze_transcript") as mock_analyze, \
         patch("app.services.realtime.extract_metrics") as mock_extract:
        
        mock_analyze.return_value = MagicMock(
            overall_score=80.0, clarity_score=80.0, confidence_score=80.0, 
            content_score=80.0, delivery_score=80.0, improvements=[]
        )
        mock_extract.return_value = MagicMock(word_count=10, filler_count=0, transition_count=0)
        
        handler = sio.handlers["/"]["transcript_chunk"]
        await handler(sid, {"session_id": session_id, "content": "Hello world"})
        sio.emit.assert_any_call("live_feedback", ANY, room=session_id)

@pytest.mark.asyncio
async def test_vision_voice_metrics(sio):
    sid = "sid_1"
    session_id = "session_123"
    sio.emit = AsyncMock()
    
    # Send vision metrics
    handler = sio.handlers["/"]["vision_metrics"]
    for _ in range(3):
        await handler(sid, {"session_id": session_id, "eye_yaw": 1.0})
    
    # Should emit multimodal_update
    emitted_events = [call.args[0] for call in sio.emit.call_args_list]
    assert "multimodal_update" in emitted_events

@pytest.mark.asyncio
async def test_room_session_flow(sio):
    sid = "sid_1"
    room_id = "room_abc"
    sio.emit = AsyncMock()
    sio.enter_room = AsyncMock()
    sio.leave_room = AsyncMock()
    
    # Join Room
    handler = sio.handlers["/"]["join_room"]
    await handler(sid, {
        "room_id": room_id, 
        "user_id": "u1", 
        "display_name": "User 1"
    })
    sio.enter_room.assert_called_with(sid, f"room_{room_id}")
    
    # Join Error (no room_id)
    await handler(sid, {})
    sio.emit.assert_any_call("error", ANY, to=sid)
    
    # Room Transcript
    handler_tx = sio.handlers["/"]["room_transcript"]
    # Trigger 5 chunks to check multimodal update
    for _ in range(5):
        await handler_tx(sid, {
            "room_id": room_id,
            "user_id": "u1",
            "content": "Hello room",
            "display_name": "User 1"
        })
    sio.emit.assert_any_call("room_multimodal_update", ANY, room=f"room_{room_id}")
    
    # Leave Room
    handler_leave = sio.handlers["/"]["leave_room"]
    await handler_leave(sid, {"room_id": room_id})
    sio.leave_room.assert_called_with(sid, f"room_{room_id}")

@pytest.mark.asyncio
async def test_webrtc_signaling(sio):
    sid = "sid_1"
    target_sid = "sid_2"
    sio.emit = AsyncMock()
    
    # Offer
    handler = sio.handlers["/"]["webrtc_offer"]
    await handler(sid, {"target_sid": target_sid, "sdp": "offer_sdp"})
    sio.emit.assert_any_call("webrtc_offer", ANY, to=target_sid)
    
    # Answer
    handler = sio.handlers["/"]["webrtc_answer"]
    await handler(sid, {"target_sid": target_sid, "sdp": "answer_sdp"})
    sio.emit.assert_any_call("webrtc_answer", ANY, to=target_sid)
    
    # ICE
    handler = sio.handlers["/"]["webrtc_ice"]
    await handler(sid, {"target_sid": target_sid, "candidate": "ice_data"})
    sio.emit.assert_any_call("webrtc_ice", ANY, to=target_sid)
