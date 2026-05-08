'use client';

import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Bot, Wifi } from 'lucide-react';
import { AvatarOrb } from '@/components/AvatarOrb';
import type { PeerInfo } from '@/hooks/useWebRTC';

type Props = {
  localStream: MediaStream | null;
  peers: Map<string, PeerInfo>;
  localDisplayName: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  aiMessage: string;
  speakingUserId?: string;
  mode?: string;
};

export function VideoGrid({
  localStream,
  peers,
  localDisplayName,
  isMicOn,
  isCameraOn,
  aiMessage,
  speakingUserId,
  mode,
}: Props) {
  const totalParticipants = 1 + peers.size + 1; // local + peers + AI
  const gridCols =
    totalParticipants <= 2 ? 'grid-cols-1 sm:grid-cols-2' :
    totalParticipants <= 4 ? 'grid-cols-2' :
    'grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid gap-3 ${gridCols} video-grid`}>
      {/* Local tile */}
      <VideoTile
        stream={localStream}
        displayName={`${localDisplayName} (You)`}
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        isLocal
        isSpeaking={false}
        team={null}
      />

      {/* Remote peer tiles */}
      {Array.from(peers.values()).map((peer) => (
        <VideoTile
          key={peer.sid}
          stream={peer.stream}
          displayName={peer.display_name}
          isMicOn={true}
          isCameraOn={peer.stream?.getVideoTracks().some(t => t.enabled) ?? false}
          isLocal={false}
          isSpeaking={peer.isSpeaking}
          team={null}
        />
      ))}

      {/* AI Observer tile */}
      <div className="relative rounded-2xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-slate-900/90 to-violet-950/50 flex flex-col items-center justify-center min-h-[200px]">
        <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-400 border border-violet-500/30">
          <Bot className="h-3 w-3" /> AI Observer
        </div>
        <AvatarOrb size="md" emotion="thinking" speaking={false} />
        <p className="mt-3 text-xs text-slate-400 max-w-[200px] text-center px-3 leading-relaxed">
          {aiMessage || 'Observing the discussion...'}
        </p>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-emerald-400">
          <Wifi className="h-3 w-3" />
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}

// ── Single Video Tile ────────────────────────────────────────────────

function VideoTile({
  stream,
  displayName,
  isMicOn,
  isCameraOn,
  isLocal,
  isSpeaking,
  team,
}: {
  stream: MediaStream | null;
  displayName: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  isLocal: boolean;
  isSpeaking: boolean;
  team: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-900/80 border transition-all duration-500 min-h-[200px] ${
        isSpeaking
          ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-500/20'
          : 'border-slate-700/30'
      }`}
    >
      {stream && isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
          style={{ transform: isLocal ? 'scaleX(-1)' : undefined, minHeight: '200px' }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-600">
          <div className="h-16 w-16 rounded-full bg-slate-800/80 border border-slate-700/30 flex items-center justify-center text-2xl">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <p className="mt-2 text-xs">{isCameraOn ? 'Connecting...' : 'Camera Off'}</p>
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
            )}
            <span className="text-xs font-medium text-white drop-shadow">{displayName}</span>
            {team && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                team === 'A' ? 'bg-cyan-500/30 text-cyan-400' : 'bg-rose-500/30 text-rose-400'
              }`}>
                Team {team}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isMicOn ? (
              <Mic className="h-3.5 w-3.5 text-white/70" />
            ) : (
              <MicOff className="h-3.5 w-3.5 text-rose-400" />
            )}
            {isCameraOn ? (
              <Video className="h-3.5 w-3.5 text-white/70" />
            ) : (
              <VideoOff className="h-3.5 w-3.5 text-rose-400" />
            )}
          </div>
        </div>
      </div>

      {/* Speaking glow border animation */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-2xl border-2 border-cyan-500/40 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
