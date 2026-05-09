import { redirect } from 'next/navigation';

export default function VentaMinoristaRedirect() {
  redirect('/dashboard/ventas');
}
