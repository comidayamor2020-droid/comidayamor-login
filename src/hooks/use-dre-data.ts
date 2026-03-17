import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINT, PLACEHOLDER_DATA, type DreData } from "@/lib/api";

export function useDreData() {
  return useQuery<DreData>({
    queryKey: ["dre-data"],
    queryFn: async () => {
      const res = await fetch(API_ENDPOINT, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const responseText = await res.text();

      if (!res.ok) {
        throw new Error(`Falha ao carregar dados: ${res.status} - ${responseText}`);
      }

      if (!responseText || !responseText.trim()) {
        throw new Error("A API respondeu 200, mas com corpo vazio.");
      }

      return JSON.parse(responseText);
    },
    retry: 1,
    placeholderData: PLACEHOLDER_DATA,
  });
}
