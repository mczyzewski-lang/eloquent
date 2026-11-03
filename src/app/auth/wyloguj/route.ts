import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth/session";
import { absoluteUrl } from "@/lib/config";

export async function POST() {
  await signOut();
  return NextResponse.redirect(absoluteUrl("/"), 303);
}
