import { IntercomCall } from '@/types/intercom';

const BACKEND_URL = 'https://api.sip.neolia.ch';

export const intercomService = {
  /**
   * Simule la réception d'un appel depuis l'interphone
   * Dans la vraie app, cela viendra d'une push notification
   */
  async simulateIncomingCall(from: string, to: string): Promise<IntercomCall> {
    const response = await fetch(`${BACKEND_URL}/webhook/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from_num: from,
        to: to,
        video: 'yes',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create call');
    }

    const data = await response.json();

    return {
      id: Date.now().toString(),
      room: data.room,
      callerToken: data.caller_token,
      calleeToken: data.callee_token,
      livekitUrl: data.livekit_url,
      from,
      to,
      status: 'ringing',
      startTime: Date.now(),
      videoEnabled: true,
      audioEnabled: true,
    };
  },

  /**
   * Dans la vraie app, cette fonction sera appelée quand une push notification arrive
   */
  async handleIncomingCallNotification(payload: any): Promise<IntercomCall> {
    // Le payload viendra de FCM/APNS avec les tokens déjà générés
    return {
      id: payload.callId,
      room: payload.room,
      callerToken: payload.callerToken,
      calleeToken: payload.calleeToken,
      livekitUrl: payload.livekitUrl,
      from: payload.from,
      to: payload.to,
      status: 'ringing',
      startTime: Date.now(),
      videoEnabled: true,
      audioEnabled: true,
    };
  },
};
