// Videos de la sección "Mirá cómo funciona".
// Para cambiar un video: poné el archivo .mp4 en public/videos/ y escribí su
// ruta en `src` (por ejemplo '/videos/tutor.mp4'), o pegá el código de YouTube
// en `youtube` (lo que va después de "watch?v=" en el enlace).
// Si los dos están vacíos, se muestra la captura con el aviso "Video próximamente".
export const DEMO_VIDEOS = [
  { id: 'start', src: '/videos/pyfis-primeros-pasos.mp4', youtube: '', poster: '/videos/pyfis-primeros-pasos.jpg' },
  { id: 'tutor', src: '/videos/pyfis-tutor.mp4', youtube: '', poster: '/videos/pyfis-tutor.jpg' },
  { id: 'sim', src: '/videos/pyfis-simulaciones.mp4', youtube: '', poster: '/videos/pyfis-simulaciones.jpg' },
  { id: 'teacher', src: '/videos/pyfis-docentes.mp4', youtube: '', poster: '/videos/pyfis-docentes.jpg' },
];
