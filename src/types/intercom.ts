export interface IntercomCall {
  id: string;
  room: string;
  callerToken: string;
  calleeToken: string;
  livekitUrl: string;
  from: string;
  to: string;
  status: 'ringing' | 'active' | 'ended';
  startTime: number;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

export interface IntercomDevice {
  id: string;
  name: string;
  type: 'exterior' | 'interior';
  sipExtension: string;
  location?: string;
}

export interface IntercomCallEvent {
  type: 'incoming_call' | 'call_answered' | 'call_ended';
  call: IntercomCall;
}
