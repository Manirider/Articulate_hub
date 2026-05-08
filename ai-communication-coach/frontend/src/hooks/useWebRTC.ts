'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/services/socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export type PeerInfo = {
  sid: string;
  user_id: string;
  display_name: string;
  stream: MediaStream | null;
  connection: RTCPeerConnection | null;
  isSpeaking: boolean;
};

type UseWebRTCReturn = {
  localStream: MediaStream | null;
  peers: Map<string, PeerInfo>;
  isMicOn: boolean;
  isCameraOn: boolean;
  isConnected: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  startMedia: () => Promise<void>;
  stopMedia: () => void;
};

export function useWebRTC(roomId: string, userId: string, displayName: string): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerInfo>>(new Map());
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const peersRef = useRef<Map<string, PeerInfo>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cleanupDoneRef = useRef(false);

  // Keep refs in sync with state
  const updatePeers = useCallback(() => {
    setPeers(new Map(peersRef.current));
  }, []);

  // ── Create RTCPeerConnection for a remote peer ────────────────────

  const createPeerConnection = useCallback((remoteSid: string, remoteUserId: string, remoteDisplayName: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const socket = getSocket();

    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      const info = peersRef.current.get(remoteSid);
      if (info) {
        info.stream = event.streams[0] || new MediaStream([event.track]);
        updatePeers();
      }
    };

    // Send ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_ice', {
          target_sid: remoteSid,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
      }
    };

    // Store peer info
    peersRef.current.set(remoteSid, {
      sid: remoteSid,
      user_id: remoteUserId,
      display_name: remoteDisplayName,
      stream: null,
      connection: pc,
      isSpeaking: false,
    });
    updatePeers();

    return pc;
  }, [updatePeers]);

  // ── Start local media + join room ─────────────────────────────────

  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsMicOn(true);
      setIsCameraOn(true);

      // Join room via Socket.IO
      const socket = getSocket();
      socket.emit('join_room', {
        room_id: roomId,
        user_id: userId,
        display_name: displayName,
      });
    } catch (err) {
      console.error('[WebRTC] Failed to get media:', err);
      // Try audio-only fallback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsMicOn(true);
        setIsCameraOn(false);

        const socket = getSocket();
        socket.emit('join_room', {
          room_id: roomId,
          user_id: userId,
          display_name: displayName,
        });
      } catch {
        console.error('[WebRTC] No media devices available');
      }
    }
  }, [roomId, userId, displayName]);

  // ── Stop all media + leave room ───────────────────────────────────

  const stopMedia = useCallback(() => {
    if (cleanupDoneRef.current) return;
    cleanupDoneRef.current = true;

    // Close all peer connections
    peersRef.current.forEach((peer) => {
      peer.connection?.close();
    });
    peersRef.current.clear();
    updatePeers();

    // Stop local tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);

    // Leave Socket.IO room
    const socket = getSocket();
    socket.emit('leave_room', { room_id: roomId });

    setIsConnected(false);
  }, [roomId, updatePeers]);

  // ── Toggle mic/camera ─────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, []);

  // ── Socket.IO event handlers for signaling ────────────────────────

  useEffect(() => {
    const socket = getSocket();
    cleanupDoneRef.current = false;

    // When we receive the list of existing peers (after joining)
    const onPeersList = async (data: { room_id: string; peers: { sid: string; user_id: string; display_name: string }[] }) => {
      if (data.room_id !== roomId) return;

      // Create offers to all existing peers
      for (const peer of data.peers) {
        const pc = createPeerConnection(peer.sid, peer.user_id, peer.display_name);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc_offer', {
            target_sid: peer.sid,
            sdp: offer.sdp,
            user_id: userId,
            display_name: displayName,
          });
        } catch (err) {
          console.error('[WebRTC] Failed to create offer:', err);
        }
      }
    };

    // When a new peer joins (they will send us an offer)
    const onPeerJoined = (data: { sid: string; user_id: string; display_name: string }) => {
      // The new peer will initiate the offer — we just note them
      console.log(`[WebRTC] Peer joined: ${data.display_name} (${data.sid})`);
    };

    // When a peer leaves
    const onPeerLeft = (data: { sid: string }) => {
      const peer = peersRef.current.get(data.sid);
      if (peer) {
        peer.connection?.close();
        peersRef.current.delete(data.sid);
        updatePeers();
      }
    };

    // Handle incoming WebRTC offer
    const onOffer = async (data: { from_sid: string; sdp: string; user_id: string; display_name: string }) => {
      const pc = createPeerConnection(data.from_sid, data.user_id, data.display_name);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', {
          target_sid: data.from_sid,
          sdp: answer.sdp,
        });
      } catch (err) {
        console.error('[WebRTC] Failed to handle offer:', err);
      }
    };

    // Handle incoming WebRTC answer
    const onAnswer = async (data: { from_sid: string; sdp: string }) => {
      const peer = peersRef.current.get(data.from_sid);
      if (peer?.connection) {
        try {
          await peer.connection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
        } catch (err) {
          console.error('[WebRTC] Failed to set answer:', err);
        }
      }
    };

    // Handle incoming ICE candidate
    const onIce = async (data: { from_sid: string; candidate: RTCIceCandidateInit }) => {
      const peer = peersRef.current.get(data.from_sid);
      if (peer?.connection) {
        try {
          await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('[WebRTC] Failed to add ICE candidate:', err);
        }
      }
    };

    socket.on('room_peers_list', onPeersList);
    socket.on('room_peer_joined', onPeerJoined);
    socket.on('room_peer_left', onPeerLeft);
    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice', onIce);

    return () => {
      socket.off('room_peers_list', onPeersList);
      socket.off('room_peer_joined', onPeerJoined);
      socket.off('room_peer_left', onPeerLeft);
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice', onIce);
    };
  }, [roomId, userId, displayName, createPeerConnection, updatePeers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!cleanupDoneRef.current) {
        stopMedia();
      }
    };
  }, [stopMedia]);

  return {
    localStream,
    peers,
    isMicOn,
    isCameraOn,
    isConnected,
    toggleMic,
    toggleCamera,
    startMedia,
    stopMedia,
  };
}
