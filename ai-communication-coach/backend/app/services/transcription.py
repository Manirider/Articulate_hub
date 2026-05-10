import httpx
import asyncio
from app.core.config import settings

class TranscriptionService:
    @staticmethod
    async def transcribe(audio_content: bytes, filename: str) -> dict:
        if not settings.gladia_api_key:
            raise RuntimeError("GLADIA_API_KEY not configured. Transcription service unavailable.")

        headers = {"x-gladia-key": settings.gladia_api_key}
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # 1. Upload the file
                upload_res = await client.post(
                    "https://api.gladia.io/v2/upload",
                    headers=headers,
                    files={"file": (filename, audio_content, "audio/mpeg")}
                )
                upload_res.raise_for_status()
                audio_url = upload_res.json().get("audio_url")

                # 2. Start transcription
                trans_res = await client.post(
                    "https://api.gladia.io/v2/transcription",
                    headers=headers,
                    json={
                        "audio_url": audio_url,
                        "diarization": True,
                        "translation": False
                    }
                )
                trans_res.raise_for_status()
                result_url = trans_res.json().get("result_url")

                # 3. Poll for result
                for _ in range(45): # 45 seconds max wait
                    poll_res = await client.get(result_url, headers=headers)
                    poll_res.raise_for_status()
                    data = poll_res.json()
                    
                    if data.get("status") == "done":
                        transcript = data.get("result", {}).get("transcription", {}).get("full_transcript", "")
                        return {
                            "text": transcript,
                            "engine": "gladia_v2",
                            "status": "success"
                        }
                    elif data.get("status") == "error":
                        return {"text": "Transcription error", "error": data.get("error")}
                    
                    await asyncio.sleep(1)
                
                return {"text": "Transcription timed out", "status": "timeout"}
                
            except Exception as e:
                return {"text": "Transcription failed", "error": str(e)}

transcription_service = TranscriptionService()
