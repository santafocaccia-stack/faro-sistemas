import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gesto',
  description: 'Gestión comercial para PyMEs argentinas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Tema claro/oscuro — se aplica ANTES del primer paint para evitar
            flash. Preferencia guardada > preferencia del sistema. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('gesto:theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        {/* Escala de fuente accesible — aplica el zoom guardado ANTES del primer
            paint para evitar parpadeo. Se usa `zoom` (no font-size) porque gran
            parte de la UI usa tamaños en px que no escalan con rem. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('gesto:font-scale');var m={normal:'1',grande:'1.1',xl:'1.2',xxl:'1.35'};if(s&&m[s])document.documentElement.style.zoom=m[s];}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
