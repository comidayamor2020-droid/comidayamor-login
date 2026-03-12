import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINT, PLACEHOLDER_DATA, type DreData } from "@/lib/api";

export function useDreData() {
  return useQuery<DreData>({
    queryKey: ["dre-data"],
    queryFn: async () => {
      const res = await fetch(API_ENDPOINT);
      if (!res.ok) throw new Error("Falha ao carregar dados");
      return res.json();
    },
    retry: 1,
    placeholderData: PLACEHOLDER_DATA,
  });
}
