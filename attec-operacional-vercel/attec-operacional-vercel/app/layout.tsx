import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ATTEC Operacional',
  description: 'Escala operacional de pedidos por técnico com visão kanban e agenda diária.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
