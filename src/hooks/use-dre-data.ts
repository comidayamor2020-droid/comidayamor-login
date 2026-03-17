import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINT, PLACEHOLDER_DATA, type DreData } from "@/lib/api";

export function useDreData() {
  return useQuery<DreData>({
    queryKey: ["dre-data"],
    queryFn: async () => {
      console.log("API_ENDPOINT:", API_ENDPOINT);

      const res = await fetch(API_ENDPOINT, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("STATUS API:", res.status);
      console.log("OK API:", res.ok);

      const responseText = await res.text();
      console.log("RESPOSTA BRUTA API:", responseText);

      if (!res.ok) {
        throw new Error(`Falha ao carregar dados: ${res.status} - ${responseText}`);
      }

      const json = JSON.parse(responseText);
      console.log("DADOS API:", json);

      return json;
    },
    retry: 1,
    placeholderData: PLACEHOLDER_DATA,
  });
}
