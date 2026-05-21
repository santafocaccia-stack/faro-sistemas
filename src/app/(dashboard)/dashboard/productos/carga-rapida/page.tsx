import { listarCategorias } from '@/server/actions/categorias';
import { CargaRapidaForm } from '@/components/carga-rapida-form';

export default async function CargaRapidaPage() {
  const categorias = await listarCategorias();

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-xl mx-auto animate-fade-up">
      <CargaRapidaForm categorias={categorias} />
    </div>
  );
}
