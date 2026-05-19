"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mx-auto">
          <span className="text-2xl font-bold text-primary-foreground">SF</span>
        </div>
        <h1 className="text-2xl font-bold">Sin conexión</h1>
        <p className="text-muted-foreground max-w-sm">
          No hay conexión a internet. Verifica tu conexión y recarga la página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
