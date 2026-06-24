import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/lib/api";

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUser(userId as string),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
