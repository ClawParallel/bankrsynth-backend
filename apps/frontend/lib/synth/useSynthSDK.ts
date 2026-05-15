"use client";

import { useMemo } from "react";
import { SynthSDK } from "@bankrsynth/synth-sdk";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || BACKEND_URL;

let _sdk: SynthSDK | null = null;

export function getSynthSDK(): SynthSDK {
  if (!_sdk) {
    _sdk = new SynthSDK({ baseUrl: BACKEND_URL, wsUrl: WS_URL });
  }
  return _sdk;
}

export function useSynthSDK() {
  return useMemo(() => getSynthSDK(), []);
}
