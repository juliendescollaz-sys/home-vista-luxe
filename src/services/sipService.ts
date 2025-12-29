import JsSIP from 'jssip';

type CallEventHandler = (call: any) => void;

class SIPService {
  private ua: JsSIP.UA | null = null;
  private currentSession: any = null;
  private onIncomingCallHandler: CallEventHandler | null = null;

  init(sipConfig: {
    uri: string;
    password: string;
    wsServers: string;
    displayName?: string;
  }) {
    const socket = new JsSIP.WebSocketInterface(sipConfig.wsServers);
    
    const configuration = {
      sockets: [socket],
      uri: sipConfig.uri,
      password: sipConfig.password,
      display_name: sipConfig.displayName || 'Neolia App',
      session_timers: false,
    };

    this.ua = new JsSIP.UA(configuration);

    // Events
    this.ua.on('connected', () => {
      console.log('✅ SIP Connected');
    });

    this.ua.on('disconnected', () => {
      console.log('❌ SIP Disconnected');
    });

    this.ua.on('registered', () => {
      console.log('✅ SIP Registered');
    });

    this.ua.on('unregistered', () => {
      console.log('⚠️ SIP Unregistered');
    });

    this.ua.on('registrationFailed', (e: any) => {
      console.error('❌ SIP Registration Failed:', e);
    });

    this.ua.on('newRTCSession', (data: any) => {
      const session = data.session;
      
      if (session.direction === 'incoming') {
        console.log('📞 Incoming SIP call');
        this.currentSession = session;
        
        if (this.onIncomingCallHandler) {
          this.onIncomingCallHandler(session);
        }
      }
    });

    this.ua.start();
  }

  answer() {
    if (this.currentSession) {
      const options = {
        mediaConstraints: {
          audio: true,
          video: false,
        },
      };
      this.currentSession.answer(options);
    }
  }

  hangup() {
    if (this.currentSession) {
      this.currentSession.terminate();
      this.currentSession = null;
    }
  }

  onIncomingCall(handler: CallEventHandler) {
    this.onIncomingCallHandler = handler;
  }

  disconnect() {
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }
  }
}

export const sipService = new SIPService();
