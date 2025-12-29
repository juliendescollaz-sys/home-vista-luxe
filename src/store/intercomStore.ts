import { create } from 'zustand';
import { IntercomCall } from '@/types/intercom';

interface IntercomState {
  currentCall: IntercomCall | null;
  setCurrentCall: (call: IntercomCall | null) => void;
  updateCallStatus: (status: IntercomCall['status']) => void;
  endCall: () => void;
}

export const useIntercomStore = create<IntercomState>((set) => ({
  currentCall: null,
  
  setCurrentCall: (call) => set({ currentCall: call }),
  
  updateCallStatus: (status) => set((state) => {
    if (!state.currentCall) return state;
    return {
      currentCall: {
        ...state.currentCall,
        status,
      },
    };
  }),
  
  endCall: () => set({ currentCall: null }),
}));
