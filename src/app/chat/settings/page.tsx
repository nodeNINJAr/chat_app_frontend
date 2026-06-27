"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { AvatarPicker } from "@/components/avatar-picker";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useUserProfile } from "@/hooks/use-user-profile";
import { getMe, listBlockedUsers, unblockUser, updateProfile } from "@/lib/api";
import { initials } from "@/lib/format";
import {
  type MessageSoundVariant,
  type RingtoneVariant,
  usePreferencesStore,
} from "@/lib/preferences-store";
import { previewMessageSound, previewRingtone } from "@/lib/sounds";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const RINGTONE_OPTIONS: { value: RingtoneVariant; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "chime", label: "Chime" },
  { value: "pulse", label: "Pulse" },
];

const MESSAGE_SOUND_OPTIONS: { value: MessageSoundVariant; label: string }[] = [
  { value: "ding", label: "Ding" },
  { value: "pop", label: "Pop" },
  { value: "bell", label: "Bell" },
];

function NotificationSettings() {
  const ringtoneEnabled = usePreferencesStore((s) => s.ringtoneEnabled);
  const ringtoneVariant = usePreferencesStore((s) => s.ringtoneVariant);
  const messageSoundEnabled = usePreferencesStore((s) => s.messageSoundEnabled);
  const messageSoundVariant = usePreferencesStore((s) => s.messageSoundVariant);
  const setRingtoneEnabled = usePreferencesStore((s) => s.setRingtoneEnabled);
  const setRingtoneVariant = usePreferencesStore((s) => s.setRingtoneVariant);
  const setMessageSoundEnabled = usePreferencesStore((s) => s.setMessageSoundEnabled);
  const setMessageSoundVariant = usePreferencesStore((s) => s.setMessageSoundVariant);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Ringtone</p>
          <p className="text-xs text-muted-foreground">
            Play a sound for incoming and outgoing calls.
          </p>
        </div>
        <Checkbox
          checked={ringtoneEnabled}
          onCheckedChange={(checked) => setRingtoneEnabled(checked === true)}
        />
      </div>
      <div className="flex gap-2">
        {RINGTONE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={ringtoneVariant === option.value ? "default" : "secondary"}
            className={cn(!ringtoneEnabled && "opacity-50")}
            onClick={() => {
              setRingtoneVariant(option.value);
              previewRingtone(option.value);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Message sound</p>
          <p className="text-xs text-muted-foreground">
            Play a sound for new messages in chats you&apos;re not viewing.
          </p>
        </div>
        <Checkbox
          checked={messageSoundEnabled}
          onCheckedChange={(checked) => setMessageSoundEnabled(checked === true)}
        />
      </div>
      <div className="flex gap-2">
        {MESSAGE_SOUND_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={messageSoundVariant === option.value ? "default" : "secondary"}
            className={cn(!messageSoundEnabled && "opacity-50")}
            onClick={() => {
              setMessageSoundVariant(option.value);
              previewMessageSound(option.value);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </>
  );
}

function BlockedUserRow({ blockedId, onUnblocked }: { blockedId: string; onUnblocked: () => void }) {
  const { data: profile } = useUserProfile(blockedId);

  async function handleUnblock() {
    try {
      await unblockUser(blockedId);
      onUnblocked();
      toast.success("Unblocked");
    } catch {
      toast.error("Failed to unblock");
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2">
      <Avatar className="size-8">
        <AvatarFallback>{initials(profile?.displayName ?? "?")}</AvatarFallback>
      </Avatar>
      <span className="flex-1 text-sm">{profile?.displayName ?? "…"}</span>
      <Button size="sm" variant="outline" onClick={handleUnblock}>
        Unblock
      </Button>
    </div>
  );
}

const THEME_OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2">
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          // next-themes can't know the persisted theme until the client
          // reads localStorage, so the highlighted option can legitimately
          // differ between the server-rendered HTML and the first client
          // render — suppressHydrationWarning (next-themes' own documented
          // pattern) avoids a hydration warning for that single mismatch.
          suppressHydrationWarning
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
            theme === value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-accent",
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

function ProfileForm({ me }: { me: UserProfile }) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(me.displayName);
  const [bio, setBio] = useState(me.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);

  function refreshMe() {
    return queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  async function handleAvatarUploaded(url: string) {
    setAvatarUrl(url);
    try {
      await updateProfile({ avatarUrl: url });
      await refreshMe();
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to save avatar");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      await refreshMe();
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <AvatarPicker name={displayName} avatarUrl={avatarUrl} onUploaded={handleAvatarUploaded} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={3}
        />
      </div>

      <Button onClick={handleSave} disabled={saving} className="self-start">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </>
  );
}

export default function SettingsPage() {
  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const {
    data: blocked,
    isLoading: blockedLoading,
    refetch: refetchBlocked,
  } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: listBlockedUsers,
  });

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
        <div>
          <h1 className="text-lg font-semibold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Update how others see you across the app.
          </p>
        </div>

        {meLoading && (
          <div className="flex flex-col gap-4">
            <div className="size-16 animate-pulse rounded-full bg-muted" />
            <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-20 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
          </div>
        )}
        {me && <ProfileForm me={me} />}

        <Separator />

        <div>
          <h2 className="text-lg font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground">Choose how the app looks.</p>
        </div>

        <AppearanceSettings />

        <Separator />

        <div>
          <h2 className="text-lg font-semibold">Notifications &amp; sound</h2>
          <p className="text-sm text-muted-foreground">
            Choose how calls and new messages sound.
          </p>
        </div>

        <NotificationSettings />

        <Separator />

        <div>
          <h2 className="text-lg font-semibold">Blocked users</h2>
          <p className="text-sm text-muted-foreground">
            Blocked users can&apos;t message or call you.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {blockedLoading &&
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
              </div>
            ))}
          {blocked?.length === 0 && (
            <p className="text-sm text-muted-foreground">No blocked users.</p>
          )}
          {blocked?.map((b) => (
            <BlockedUserRow
              key={b.blockedId}
              blockedId={b.blockedId}
              onUnblocked={() => refetchBlocked()}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
