"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateGroupSettings } from "@/lib/api";
import type { GroupSummary } from "@/lib/types";

export function GroupSettingsForm({
  group,
  onSaved,
  onCancel,
}: {
  group: GroupSummary;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [whoCanSendMessages, setWhoCanSendMessages] = useState(
    group.settings.whoCanSendMessages,
  );
  const [whoCanAddMembers, setWhoCanAddMembers] = useState(group.settings.whoCanAddMembers);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateGroupSettings(group.id, {
        name: name.trim() || undefined,
        description,
        settings: { whoCanSendMessages, whoCanAddMembers },
      });
      toast.success("Group updated");
      onSaved();
    } catch {
      toast.error("Failed to update group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="group-edit-name">Name</Label>
        <Input id="group-edit-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="group-edit-description">Description</Label>
        <Textarea
          id="group-edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Who can send messages</Label>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={whoCanSendMessages}
          onChange={(e) => setWhoCanSendMessages(e.target.value as "everyone" | "admins")}
        >
          <option value="everyone">Everyone</option>
          <option value="admins">Admins only</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Who can add members</Label>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={whoCanAddMembers}
          onChange={(e) => setWhoCanAddMembers(e.target.value as "everyone" | "admins")}
        >
          <option value="everyone">Everyone</option>
          <option value="admins">Admins only</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
