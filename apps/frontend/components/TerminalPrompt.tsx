"use client";
import { useState } from "react";

export default function TerminalPrompt({ onExecute }:{onExecute:()=>void}) {
  const [cmd,setCmd] = useState("");

  const submit = () => {
    if (cmd === "launch" || cmd === "intel") onExecute();
  };

  return (
    <div className="mt-6">
      <span className="text-green-500">root@bankrsynth:~$ </span>
      <input
        className="bg-black outline-none"
        onChange={e=>setCmd(e.target.value)}
      />
      <button onClick={submit} className="ml-3 border px-3">
        EXEC
      </button>
    </div>
  );
}