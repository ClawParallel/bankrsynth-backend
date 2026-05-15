"use client";
import { useEffect, useState } from "react";

export default function AccessGranted() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center text-4xl text-green-400 z-50">
      ACCESS GRANTED
    </div>
  );
}