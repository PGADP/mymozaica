'use client'
import { useReactMediaRecorder } from "react-media-recorder";
import { Mic, Square } from "lucide-react";
import { useEffect, useRef } from "react";

export default function AudioRecorder({ onAudioReady }: { onAudioReady: (blob: Blob) => void }) {
  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({ audio: true });
  const processedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Ne traiter que si on a une nouvelle URL et qu'elle n'a pas déjà été traitée
    if (status === "stopped" && mediaBlobUrl && mediaBlobUrl !== processedUrlRef.current) {
      processedUrlRef.current = mediaBlobUrl;
      fetch(mediaBlobUrl).then(r => r.blob()).then(onAudioReady);
    }
  }, [status, mediaBlobUrl]);

  const isRecording = status === "recording";

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center ${
        isRecording 
          ? "bg-red-500 text-white animate-pulse shadow-lg ring-4 ring-red-200" 
          : "bg-[#FDF6E3] text-[#2C3E50] hover:bg-[#E76F51] hover:text-white border border-[#2C3E50]/10"
      }`}
      title={isRecording ? "Arrêter l'enregistrement" : "Répondre vocalement"}
      type="button"
    >
      {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
    </button>
  );
}