import GlibViewer from '@/components/glib/GlibViewer';

export default function Home() {
  return (
    <main className="w-full h-screen">
      <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-black/90 p-4 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-2">3D Tiles Viewer</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Viewing GLB tiles from Google Maps 3D Tiles API
        </p>
      </div>
      <GlibViewer modelDirectory="/tiles" />
    </main>
  );
}
