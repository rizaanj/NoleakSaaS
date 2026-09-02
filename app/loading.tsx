export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <h1
          className="text-lg font-medium text-gray-900"
          style={{
            fontFamily: "var(--font-geist-mono)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          NOLEAK
        </h1>
        <div className="flex gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-gray-400"
            style={{ animation: "bounce 0.6s ease-in-out infinite" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-gray-400"
            style={{ animation: "bounce 0.6s ease-in-out 0.15s infinite" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-gray-400"
            style={{ animation: "bounce 0.6s ease-in-out 0.3s infinite" }}
          />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
