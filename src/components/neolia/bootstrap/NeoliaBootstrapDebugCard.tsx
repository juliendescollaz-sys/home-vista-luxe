// src/components/neolia/bootstrap/NeoliaBootstrapDebugCard.tsx

import { useState } from "react";
import { useNeoliaBootstrap } from "./useNeoliaBootstrap";

export function NeoliaBootstrapDebugCard() {
  const [text, setText] = useState("");
  const { status, haConnection, error, applyFromPayload, reset } =
    useNeoliaBootstrap();

  const handleTest = () => {
    try {
      const parsed = JSON.parse(text);
      applyFromPayload(parsed);
    } catch (e) {
      applyFromPayload(null);
    }
  };

  const handleReset = () => {
    setText("");
    reset();
  };

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Neolia bootstrap debug</h2>
        <p className="text-sm text-muted-foreground">
          Collez ici le JSON reçu depuis le topic MQTT{" "}
          <code>neolia/config/global</code> pour tester le parsing.
        </p>
      </div>

      <textarea
        className="w-full min-h-[160px] rounded-md border bg-background p-2 font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{"service": "neolia-config", "version": 1, ...}'
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleTest}
          className="rounded-md border px-3 py-1 text-sm"
        >
          Tester le payload
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border px-3 py-1 text-sm"
        >
          Reset
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-semibold">Status :</span>{" "}
          <span>{status}</span>
        </div>

        {error && (
          <div className="text-red-500">
            <span className="font-semibold">Erreur :</span> {error}
          </div>
        )}

        {haConnection && (
          <div className="space-y-1">
            <div>
              <span className="font-semibold">HA URL :</span>{" "}
              <span className="font-mono text-xs">{haConnection.baseUrl}</span>
            </div>
            <div>
              <span className="font-semibold">Token :</span>{" "}
              <span className="font-mono text-[10px] break-all">
                {haConnection.token}
              </span>
            </div>
            <div>
              <span className="font-semibold">MQTT host :</span>{" "}
              <span className="font-mono text-xs">
                {haConnection.mqttHost}:{haConnection.mqttPort}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
