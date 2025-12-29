import { useState, useEffect, useCallback, useRef } from 'react';
import { RemoteTrack, RemoteParticipant } from 'livekit-client';
import { livekitService } from '@/services/livekitService';
import { useIntercomStore } from '@/store/intercomStore';
import { IntercomCall } from '@/types/intercom';

export const useVideoCall = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<RemoteTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<RemoteTrack | null>(null);
  
  const { currentCall, updateCallStatus, endCall } = useIntercomStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const connect = useCallback(async (call: IntercomCall) => {
    setIsConnecting(true);
    setError(null);

    try {
      // Setup callbacks
      livekitService.setOnTrackSubscribed((track, participant) => {
        console.log('Track received:', track.kind);
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

      // Attach local video
      if (localVideoRef.current && room.localParticipant.videoTrackPublications.size > 0) {
        const localVideoTrack = Array.from(room.localParticipant.videoTrackPublications.values())[0].track;
        if (localVideoTrack) {
          localVideoRef.current.srcObject = new MediaStream([localVideoTrack.mediaStreamTrack]);
        }
      }

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
      const element = remoteAudioTrack.attach();
      document.body.appendChild(element);
      
      return () => {
        remoteAudioTrack.detach();
        element.remove();
      };
    }
  }, [remoteAudioTrack]);

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
