import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGroup, listGroupMembers } from "@/lib/api";

export function useGroup(groupId: string | null | undefined) {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroup(groupId as string),
    enabled: !!groupId,
  });
}

export function useGroupMembers(groupId: string | null | undefined) {
  return useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => listGroupMembers(groupId as string),
    enabled: !!groupId,
  });
}

export function useInvalidateGroup(groupId: string | null | undefined) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
  };
}
