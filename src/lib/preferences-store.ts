import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RingtoneVariant = "classic" | "chime" | "pulse";
export type MessageSoundVariant = "ding" | "pop" | "bell";

interface PreferencesState {
  ringtoneEnabled: boolean;
  ringtoneVariant: RingtoneVariant;
  messageSoundEnabled: boolean;
  messageSoundVariant: MessageSoundVariant;
  setRingtoneEnabled: (enabled: boolean) => void;
  setRingtoneVariant: (variant: RingtoneVariant) => void;
  setMessageSoundEnabled: (enabled: boolean) => void;
  setMessageSoundVariant: (variant: MessageSoundVariant) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ringtoneEnabled: true,
      ringtoneVariant: "classic",
      messageSoundEnabled: true,
      messageSoundVariant: "ding",
      setRingtoneEnabled: (ringtoneEnabled) => set({ ringtoneEnabled }),
      setRingtoneVariant: (ringtoneVariant) => set({ ringtoneVariant }),
      setMessageSoundEnabled: (messageSoundEnabled) => set({ messageSoundEnabled }),
      setMessageSoundVariant: (messageSoundVariant) => set({ messageSoundVariant }),
    }),
    { name: "chat-preferences" },
  ),
);
