import { env } from "cloudflare:workers";
import { receiveResponse, type WeddingConfig } from "@/lib/wedding-responses";
export async function POST(request: Request) {
  return receiveResponse(request, env as unknown as WeddingConfig);
}
