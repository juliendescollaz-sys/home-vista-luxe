import { useState, useEffect, useCallback, useRef } from 'react';
import { RemoteTrack, RemoteParticipant } from 'livekit-client';
import { livekitService } from '@/services/livekitService';
import { useIntercomStore } from '@/store/intercomStore';
import { IntercomCall } from '@/types/intercom';
import { websocketService } from '@/services/websocketService';
import { sipService } from '@/services/sipService';

export const useVideoCall = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<RemoteTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<RemoteTrack | null>(null);
  
  const { currentCall, updateCallStatus, endCall, setCurrentCall } = useIntercomStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const connect = useCallback(async (call: IntercomCall) => {
    setIsConnecting(true);
    setError(null);

    try {
      // Setup callbacks
      livekitService.setOnTrackSubscribed((track, participant) => {
        console.log('Track received:', track.kind, 'from', participant.identity);
        if (track.kind === 'video') {
          setRemoteVideoTrack(track);
        } else if (track.kind === 'audio') {
          setRemoteAudioTrack(track);
        }
      });

      livekitService.setOnConnected(() => {
        setIsConnected(true);
        updateCallStatus('active');
      });

      livekitService.setOnDisconnected(() => {
        setIsConnected(false);
        endCall();
      });

      // Connect to LiveKit
      const room = await livekitService.connect(call.livekitUrl, call.calleeToken);

      // Active SEULEMENT le micro (pas la caméra)
      await room.localParticipant.setMicrophoneEnabled(true);

      console.log('✅ Connected to LiveKit, microphone enabled');

    } catch (err) {
      console.error('Failed to connect to LiveKit:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      updateCallStatus('ended');
    } finally {
      setIsConnecting(false);
    }
  }, [updateCallStatus, endCall]);

  const disconnect = useCallback(() => {
    livekitService.disconnect();
    setIsConnected(false);
    setRemoteVideoTrack(null);
    setRemoteAudioTrack(null);
    endCall();
  }, [endCall]);

  // Attach remote video when track is received
  useEffect(() => {
    if (remoteVideoTrack && remoteVideoRef.current) {
      console.log('📹 Attaching remote video track');
      const element = remoteVideoTrack.attach();
      remoteVideoRef.current.appendChild(element);
      
      return () => {
        remoteVideoTrack.detach();
      };
    }
  }, [remoteVideoTrack]);

  // Attach remote audio when track is received
  useEffect(() => {
    if (remoteAudioTrack) {
      console.log('🔊 Attaching remote audio track');
      const element = remoteAudioTrack.attach();
      document.body.appendChild(element);
      
      return () => {
        remoteAudioTrack.detach();
        element.remove();
      };
    }
  }, [remoteAudioTrack]);

  // Connect to WebSocket for incoming calls
  useEffect(() => {
    websocketService.connect();
    
    websocketService.onIncomingCall((call) => {
      console.log('📞 Incoming call received:', call);
      setCurrentCall(call);
    });

    return () => {
      websocketService.disconnect();
    };
  }, [setCurrentCall]);

  // Handle incoming SIP calls
  useEffect(() => {
    sipService.onIncomingCall((session: any) => {
      console.log('📞 SIP call session received');
      
      // Setup audio stream
      session.on('confirmed', () => {
        console.log('✅ SIP call confirmed');
        const remoteStream = session.connection.getRemoteStreams()[0];
        if (remoteStream) {
          const audioElement = new Audio();
          audioElement.srcObject = remoteStream;
          audioElement.play();
        }
      });

      session.on('ended', () => {
        console.log('📴 SIP call ended');
      });

      // Auto-answer when user accepts the intercom call
      if (currentCall?.status === 'active') {
        sipService.answer();
      }
    });
  }, [currentCall]);

  return {
    connect,
    disconnect,
    isConnecting,
    isConnected,
    error,
    localVideoRef,
    remoteVideoRef,
    currentCall,
  };
};
