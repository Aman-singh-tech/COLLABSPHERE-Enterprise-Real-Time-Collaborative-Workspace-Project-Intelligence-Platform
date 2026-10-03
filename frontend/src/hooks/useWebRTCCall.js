import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: 'e8dd65b92a0cfd1be9b85a10',
      credential: '5Y3WJSC0+Fh3VkaS',
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: 'e8dd65b92a0cfd1be9b85a10',
      credential: '5Y3WJSC0+Fh3VkaS',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: 'e8dd65b92a0cfd1be9b85a10',
      credential: '5Y3WJSC0+Fh3VkaS',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: 'e8dd65b92a0cfd1be9b85a10',
      credential: '5Y3WJSC0+Fh3VkaS',
    },
  ],
  iceCandidatePoolSize: 10,
};

export const useWebRTCCall = ({ socket, activeChatId, user }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [participants, setParticipants] = useState({}); // socketId -> { stream, user, isMuted, isVideoOff, isScreenSharing }
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnectionsRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const pendingCandidatesRef = useRef(new Map()); // socketId -> ICECandidate[]  (queued before remoteDescription)
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const screenTrackRef = useRef(null);
  const timerRef = useRef(null);
  const activeChatIdRef = useRef(activeChatId);
  const isCallActiveRef = useRef(false);   // ref-copy so reconnect handler sees live value
  const socketRef = useRef(socket);         // ref-copy so reconnect closure is never stale

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Keep isCallActiveRef in sync
  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  // Handle call timer
  useEffect(() => {
    if (isCallActive) {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive]);

  // Clean peer connections and stream
  const cleanupCall = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      try { pc.close(); } catch (e) { /* ignore */ }
    });
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();

    // Stop screen share track first
    if (screenTrackRef.current) {
      try { screenTrackRef.current.stop(); } catch (e) { /* ignore */ }
      screenTrackRef.current = null;
    }

    // Stop all local media tracks (camera + mic)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) { /* ignore */ }
      });
      localStreamRef.current = null;
    }
    cameraTrackRef.current = null;

    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    setLocalStream(null);
    setParticipants({});
    setIsCallActive(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
  }, []);

  // Flush queued ICE candidates for a given peer
  const flushCandidates = useCallback(async (peerId, pc) => {
    const queued = pendingCandidatesRef.current.get(peerId);
    if (queued && queued.length > 0) {
      console.log(`[WebRTC] Flushing ${queued.length} queued ICE candidates for ${peerId}`);
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Failed to add queued ICE candidate:', err);
        }
      }
      pendingCandidatesRef.current.set(peerId, []);
    }
  }, []);

  const createPeerConnection = useCallback((targetSocketId, participantUser, isInitiator = false) => {
    if (peerConnectionsRef.current.has(targetSocketId)) {
      return peerConnectionsRef.current.get(targetSocketId);
    }

    console.log(`[WebRTC] Creating peer connection to ${targetSocketId} (initiator: ${isInitiator})`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetSocketId, pc);

    // Initialize candidate queue for this peer
    if (!pendingCandidatesRef.current.has(targetSocketId)) {
      pendingCandidatesRef.current.set(targetSocketId, []);
    }

    // Add local stream tracks to PC
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
      console.log(`[WebRTC] Added ${localStreamRef.current.getTracks().length} local tracks`);
    } else {
      console.warn('[WebRTC] No local stream available when creating peer connection!');
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:signal', {
          to: targetSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state for ${targetSocketId}: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === 'failed') {
        console.log('[WebRTC] ICE connection failed, attempting restart...');
        // Try ICE restart
        if (isInitiator && pc.signalingState !== 'closed') {
          pc.createOffer({ iceRestart: true })
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              socket.emit('call:signal', {
                to: targetSocketId,
                signal: { type: 'offer', sdp: pc.localDescription },
              });
            })
            .catch((err) => console.error('[WebRTC] ICE restart failed:', err));
        }
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received track from ${targetSocketId}: kind=${event.track.kind}`);
      
      setParticipants((prev) => {
        const existing = prev[targetSocketId];
        
        // If we already have a stream for this participant, add the new track to it
        if (existing && existing.stream) {
          // Check if this track type already exists
          const existingTracks = existing.stream.getTracks().filter(t => t.kind === event.track.kind);
          if (existingTracks.length > 0) {
            // Replace the existing track of the same kind
            existingTracks.forEach(t => existing.stream.removeTrack(t));
          }
          existing.stream.addTrack(event.track);
          return { ...prev }; // trigger re-render
        }

        // Create new participant entry with a fresh stream
        let remoteStream;
        if (event.streams && event.streams[0]) {
          remoteStream = event.streams[0];
        } else {
          remoteStream = new MediaStream([event.track]);
        }

        return {
          ...prev,
          [targetSocketId]: {
            socketId: targetSocketId,
            user: participantUser || prev[targetSocketId]?.user || { firstName: 'Team Member' },
            stream: remoteStream,
            isMuted: prev[targetSocketId]?.isMuted || false,
            isVideoOff: prev[targetSocketId]?.isVideoOff || false,
            isScreenSharing: prev[targetSocketId]?.isScreenSharing || false,
          },
        };
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state for ${targetSocketId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        // Hard failure — remove immediately
        peerConnectionsRef.current.delete(targetSocketId);
        pendingCandidatesRef.current.delete(targetSocketId);
        setParticipants((prev) => {
          const next = { ...prev };
          delete next[targetSocketId];
          return next;
        });
      }
      // 'disconnected' is transient — WebRTC may self-recover within a few seconds.
      // We intentionally do NOT remove the peer here; oniceconnectionstatechange
      // will handle a hard 'failed' if recovery doesn't happen.
    };

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          console.log(`[WebRTC] Sent offer to ${targetSocketId}`);
          socket.emit('call:signal', {
            to: targetSocketId,
            signal: { type: 'offer', sdp: pc.localDescription },
          });
        })
        .catch((err) => console.error('Error creating WebRTC offer:', err));
    }

    return pc;
  }, [socket, flushCandidates]);

  // Handle incoming socket signals
  useEffect(() => {
    if (!socket || !isCallActive) return;

    const handleRoomUsers = ({ participants: existingPeers }) => {
      console.log(`[WebRTC] Room users received: ${existingPeers.length} existing peers`);
      existingPeers.forEach(({ socketId: peerId, user: peerUser }) => {
        createPeerConnection(peerId, peerUser, true);
      });
    };

    const handleUserJoined = ({ socketId: peerId, user: peerUser }) => {
      console.log(`[WebRTC] User joined: ${peerUser?.firstName} (${peerId})`);
      setParticipants((prev) => ({
        ...prev,
        [peerId]: {
          socketId: peerId,
          user: peerUser,
          stream: null,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
        },
      }));
      // The new user will send us an offer (they are the initiator via handleRoomUsers)
    };

    const handleSignal = async ({ from: peerId, signal, user: peerUser }) => {
      try {
        let pc = peerConnectionsRef.current.get(peerId);

        if (signal.type === 'offer') {
          // If we already have a connection in a non-stable state, close it and recreate
          if (pc && pc.signalingState !== 'stable' && pc.signalingState !== 'closed') {
            console.log(`[WebRTC] Resetting connection for ${peerId} (was in state: ${pc.signalingState})`);
            pc.close();
            peerConnectionsRef.current.delete(peerId);
            pendingCandidatesRef.current.delete(peerId);
            pc = null;
          }
          
          if (!pc) {
            pc = createPeerConnection(peerId, peerUser, false);
          }

          console.log(`[WebRTC] Received offer from ${peerId}, creating answer...`);
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          
          // Flush any ICE candidates that arrived before the remote description
          await flushCandidates(peerId, pc);
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log(`[WebRTC] Sent answer to ${peerId}`);
          socket.emit('call:signal', {
            to: peerId,
            signal: { type: 'answer', sdp: pc.localDescription },
          });

        } else if (signal.type === 'answer') {
          if (!pc) {
            console.warn(`[WebRTC] Received answer but no peer connection for ${peerId}`);
            return;
          }
          if (pc.signalingState === 'have-local-offer') {
            console.log(`[WebRTC] Received answer from ${peerId}`);
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            // Flush any ICE candidates that arrived before the remote description
            await flushCandidates(peerId, pc);
          } else {
            console.warn(`[WebRTC] Ignoring answer in state: ${pc.signalingState}`);
          }

        } else if (signal.type === 'candidate') {
          if (!signal.candidate) return;

          if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
            // Queue the candidate until remote description is set
            console.log(`[WebRTC] Queuing ICE candidate for ${peerId} (no remote description yet)`);
            if (!pendingCandidatesRef.current.has(peerId)) {
              pendingCandidatesRef.current.set(peerId, []);
            }
            pendingCandidatesRef.current.get(peerId).push(signal.candidate);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.error('[WebRTC] Error handling signal:', err);
      }
    };

    const handleMediaStateChanged = ({ socketId: peerId, isMuted: peerMuted, isVideoOff: peerVideoOff, isScreenSharing: peerScreenShare }) => {
      setParticipants((prev) => {
        if (!prev[peerId]) return prev;
        return {
          ...prev,
          [peerId]: {
            ...prev[peerId],
            isMuted: peerMuted !== undefined ? peerMuted : prev[peerId].isMuted,
            isVideoOff: peerVideoOff !== undefined ? peerVideoOff : prev[peerId].isVideoOff,
            isScreenSharing: peerScreenShare !== undefined ? peerScreenShare : prev[peerId].isScreenSharing,
          },
        };
      });
    };

    const handleUserLeft = ({ socketId: peerId }) => {
      console.log(`[WebRTC] User left: ${peerId}`);
      const pc = peerConnectionsRef.current.get(peerId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(peerId);
      }
      pendingCandidatesRef.current.delete(peerId);
      setParticipants((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    };

    socket.on('call:room-users', handleRoomUsers);
    socket.on('call:user-joined', handleUserJoined);
    socket.on('call:signal', handleSignal);
    socket.on('call:media-state-changed', handleMediaStateChanged);
    socket.on('call:user-left', handleUserLeft);

    return () => {
      socket.off('call:room-users', handleRoomUsers);
      socket.off('call:user-joined', handleUserJoined);
      socket.off('call:signal', handleSignal);
      socket.off('call:media-state-changed', handleMediaStateChanged);
      socket.off('call:user-left', handleUserLeft);
    };
  }, [socket, isCallActive, createPeerConnection, flushCandidates]);

  // ── Socket Reconnect Handler ─────────────────────────────────────────────
  // If the socket drops & reconnects mid-call, automatically re-join the call
  // room so signalling resumes and peer connections can be re-established.
  useEffect(() => {
    if (!socket) return;

    const handleReconnect = () => {
      if (!isCallActiveRef.current || !activeChatIdRef.current) return;
      console.log('[WebRTC] Socket reconnected during active call — re-joining call room...');

      // Close stale peer connections; the other side will re-offer
      peerConnectionsRef.current.forEach((pc) => {
        try { pc.close(); } catch (e) { /* ignore */ }
      });
      peerConnectionsRef.current.clear();
      pendingCandidatesRef.current.clear();
      setParticipants({});

      // Re-join the call room on the server
      socketRef.current.emit('call:join', { chatId: activeChatIdRef.current });
    };

    socket.on('reconnect', handleReconnect);
    socket.io.on('reconnect', handleReconnect); // socket.io manager-level event

    return () => {
      socket.off('reconnect', handleReconnect);
      socket.io.off('reconnect', handleReconnect);
    };
  }, [socket]);


  // Start / Join Call
  const startCall = async () => {
    try {
      setError(null);
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (mediaErr) {
        console.warn('Full video+audio media capture failed, trying audio-only fallback:', mediaErr);
        // Fallback to audio-only if camera is blocked or in use by another tab/window
        stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        setIsVideoOff(true);
      }

      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0] || null;
      setLocalStream(stream);
      setIsCallActive(true);

      if (socket && activeChatIdRef.current) {
        socket.emit('call:join', { chatId: activeChatIdRef.current });
      }
    } catch (err) {
      console.error('Failed to get media devices:', err);
      let msg = 'Could not access camera/microphone. Please check browser permissions.';
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera or microphone found on your device.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera or microphone permission was denied.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera or microphone is currently locked by another app or browser tab.';
      }
      setError(msg);
    }
  };

  // Leave Call — capture socket & chatId at call-time so they're never stale
  const leaveCall = useCallback(() => {
    // Grab current values synchronously before any state change
    const chatId = activeChatIdRef.current;
    const currentSocket = socket;

    // 1. Notify server FIRST (before listeners are torn down by isCallActive→false)
    if (currentSocket && chatId) {
      currentSocket.emit('call:leave', { chatId });
    }

    // 2. Run cleanup on next tick so the emit is flushed before the effect
    //    that watches isCallActive removes the socket listeners
    setTimeout(() => {
      cleanupCall();
    }, 0);
  }, [socket, cleanupCall]);

  // Toggle Microphone
  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const nextMuted = !audioTrack.enabled;
      setIsMuted(nextMuted);

      if (socket && activeChatIdRef.current) {
        socket.emit('call:toggle-media', {
          chatId: activeChatIdRef.current,
          isMuted: nextMuted,
          isVideoOff,
          isScreenSharing,
        });
      }
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const nextVideoOff = !videoTrack.enabled;
      setIsVideoOff(nextVideoOff);

      if (socket && activeChatIdRef.current) {
        socket.emit('call:toggle-media', {
          chatId: activeChatIdRef.current,
          isMuted,
          isVideoOff: nextVideoOff,
          isScreenSharing,
        });
      }
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!localStreamRef.current) return;

    if (isScreenSharing) {
      // Revert to camera track
      if (cameraTrackRef.current) {
        const videoSenderTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoSenderTrack) {
          localStreamRef.current.removeTrack(videoSenderTrack);
          localStreamRef.current.addTrack(cameraTrackRef.current);
        }

        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(cameraTrackRef.current);
          }
        });
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      setIsScreenSharing(false);

      if (socket && activeChatIdRef.current) {
        socket.emit('call:toggle-media', {
          chatId: activeChatIdRef.current,
          isMuted,
          isVideoOff,
          isScreenSharing: false,
        });
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (currentVideoTrack) {
          localStreamRef.current.removeTrack(currentVideoTrack);
        }
        localStreamRef.current.addTrack(screenTrack);

        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        setIsScreenSharing(true);

        screenTrack.onended = () => {
          toggleScreenShare(); // auto revert when user stops sharing via browser floating bar
        };

        if (socket && activeChatIdRef.current) {
          socket.emit('call:toggle-media', {
            chatId: activeChatIdRef.current,
            isMuted,
            isVideoOff,
            isScreenSharing: true,
          });
        }
      } catch (err) {
        console.error('Failed to start screen share:', err);
      }
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  return {
    isCallActive,
    localStream,
    participants,
    isMuted,
    isVideoOff,
    isScreenSharing,
    error,
    callDuration,
    startCall,
    leaveCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  };
};
