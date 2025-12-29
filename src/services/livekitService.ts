import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from 'livekit-client';

export class LiveKitService {
  private room: Room | null = null;
  private onTrackSubscribed?: (track: RemoteTrack, participant: RemoteParticipant) => void;
  private onConnected?: () => void;
  private onDisconnected?: () => void;

  async connect(url: string, token: string): Promise<Room> {
    this.room = new Room();

    // Setup event listeners
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('Track subscribed:', track.kind, 'from', participant.identity);
      if (this.onTrackSubscribed && (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio)) {
        this.onTrackSubscribed(track as RemoteTrack, participant);
      }
    });

    this.room.on(RoomEvent.Connected, () => {
      console.log('Connected to LiveKit room');
      if (this.onConnected) this.onConnected();
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from LiveKit room');
      if (this.onDisconnected) this.onDisconnected();
    });

    // Connect to room
    await this.room.connect(url, token);

    // Enable camera and microphone
    await this.room.localParticipant.enableCameraAndMicrophone();

    return this.room;
  }

  disconnect() {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
  }

  setOnTrackSubscribed(callback: (track: RemoteTrack, participant: RemoteParticipant) => void) {
    this.onTrackSubscribed = callback;
  }

  setOnConnected(callback: () => void) {
    this.onConnected = callback;
  }

  setOnDisconnected(callback: () => void) {
    this.onDisconnected = callback;
  }

  getRoom(): Room | null {
    return this.room;
  }
}

export const livekitService = new LiveKitService();
