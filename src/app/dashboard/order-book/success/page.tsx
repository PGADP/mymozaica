'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { CheckCircle, Package, Mail, ArrowRight, Loader2 } from 'lucide-react';

export default function OrderSuccessPage() {
  const router = useRouter();
  const supabase = createClient();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Charger la derniere commande
      const { data: order } = await supabase
        .from('orders')
        .select('order_number, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (order) {
        setOrderNumber(order.order_number);
      }

      setIsLoading(false);
    }

    loadOrder();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg-main to-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Animation de succes */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-pulse">
              <CheckCircle className="text-white" size={48} />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-white text-sm">!</span>
            </div>
          </div>
        </div>

        {/* Message principal */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center">
          <h1 className="text-3xl font-heading font-bold text-text-main mb-3">
            Commande confirmee !
          </h1>
          <p className="text-text-muted mb-6">
            Votre livre est en cours de preparation. Vous recevrez un email a chaque etape.
          </p>

          {orderNumber && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-text-muted mb-1">Numero de commande</p>
              <p className="font-mono font-bold text-lg text-text-main">{orderNumber}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="text-left space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-white" size={16} />
              </div>
              <div>
                <p className="font-medium text-text-main">Commande recue</p>
                <p className="text-sm text-text-muted">Votre commande a ete enregistree</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                <Package className="text-white" size={16} />
              </div>
              <div>
                <p className="font-medium text-text-main">En cours de preparation</p>
                <p className="text-sm text-text-muted">Votre livre est en cours d'impression</p>
              </div>
            </div>
            <div className="flex items-start gap-3 opacity-50">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="text-gray-400" size={16} />
              </div>
              <div>
                <p className="font-medium text-text-main">Expedition</p>
                <p className="text-sm text-text-muted">Vous recevrez un email avec le suivi</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="w-full py-3 bg-secondary hover:bg-secondary-hover text-white rounded-xl font-heading font-bold flex items-center justify-center gap-2 transition-all"
            >
              Retour au tableau de bord
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/dashboard/book"
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-text-main rounded-xl font-heading font-bold flex items-center justify-center gap-2 transition-all"
            >
              Voir mon livre
            </Link>
          </div>
        </div>

        {/* Note */}
        <p className="text-center text-sm text-text-muted mt-6">
          Un email de confirmation a ete envoye a votre adresse.
        </p>
      </div>
    </div>
  );
}
