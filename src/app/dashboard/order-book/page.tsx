'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Header from '@/components/dashboard/Header';
import ShippingAddressForm from '@/components/orders/ShippingAddressForm';
import {
  ArrowLeft,
  Book,
  Loader2,
  Package,
  Truck,
  Check,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  pack_type?: 'pack1' | 'pack2';
  books_included?: number;
  additional_books_ordered?: number;
}

interface ShippingAddress {
  id: string;
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  postcode: string;
  phone_number: string;
}

interface ShippingCost {
  total_cost_excl_tax: number;
  total_cost_incl_tax: number;
  currency: string;
}

interface Order {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
}

export default function OrderBookPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingCost, setShippingCost] = useState<ShippingCost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'address' | 'confirm' | 'processing'>('address');

  // Determiner si l'utilisateur a un livre inclus (Pack 2)
  const hasIncludedBook = profile?.pack_type === 'pack2' && (profile?.books_included || 0) > 0;

  // Charger les donnees
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Charger le profil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, first_name, last_name, full_name, pack_type, books_included, additional_books_ordered')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Charger l'adresse existante
      const { data: addressData } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (addressData) {
        setShippingAddress(addressData);
      }

      // Charger une commande en attente d'adresse
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending_address')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (orderData) {
        setPendingOrder(orderData);
      }

      // Charger le nombre de pages du livre
      const { data: chaptersData } = await supabase
        .from('book_chapters')
        .select('content')
        .eq('user_id', user.id);

      if (chaptersData && chaptersData.length > 0) {
        // Estimation : 180 mots par page
        let totalWords = 0;
        chaptersData.forEach((ch) => {
          const text = (ch.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          totalWords += text.split(' ').filter(Boolean).length;
        });
        const estimatedPages = Math.ceil(totalWords / 180) + 4; // +4 pour pages de titre, etc.
        setPageCount(Math.max(32, estimatedPages)); // Minimum 32 pages
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  // Calculer les frais de port (uniquement pour livres supplementaires)
  const calculateShipping = async (address: ShippingAddress) => {
    if (!pageCount || pageCount < 32) {
      setError('Votre livre doit avoir au moins 32 pages pour etre imprime.');
      return;
    }

    // Verifier que c'est bien une adresse en France
    if (address.country_code !== 'FR') {
      setError('La livraison est disponible uniquement en France pour le moment.');
      return;
    }

    setIsCalculatingShipping(true);
    setError(null);

    try {
      // Pour Pack 2 avec livre inclus : livraison France incluse, pas besoin de calculer
      if (hasIncludedBook) {
        setShippingCost(null); // Pas de frais supplementaires
        setStep('confirm');
        return;
      }

      // Pour livres supplementaires : calculer les frais
      const response = await fetch('/api/orders/shipping-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageCount,
          quantity: 1,
          shippingAddress: {
            city: address.city,
            country_code: 'FR', // France uniquement
            postcode: address.postcode,
          },
          shippingLevel: 'MAIL',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur calcul frais de port');
      }

      setShippingCost(data.cost);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  // Sauvegarder l'adresse
  const handleSaveAddress = async (addressData: Omit<ShippingAddress, 'id'>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecte');

      // Upsert l'adresse (insert ou update)
      const { data, error } = await supabase
        .from('shipping_addresses')
        .upsert(
          {
            user_id: user.id,
            ...addressData,
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;

      setShippingAddress(data);

      // Mettre a jour la commande avec l'adresse
      if (pendingOrder) {
        await supabase
          .from('orders')
          .update({ shipping_address_id: data.id })
          .eq('id', pendingOrder.id);
      }

      // Calculer les frais de port
      await calculateShipping(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde adresse');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generer les PDFs et creer le print job
  const handleConfirmOrder = async () => {
    if (!shippingAddress || !pendingOrder) {
      setError('Adresse ou commande manquante');
      return;
    }

    setStep('processing');
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Generer les PDFs
      const pdfResponse = await fetch('/api/orders/generate-print-pdfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: 'Mon Livre de Vie',
          authorName: profile?.full_name || profile?.first_name || 'Auteur',
        }),
      });

      const pdfData = await pdfResponse.json();

      if (!pdfResponse.ok) {
        throw new Error(pdfData.error || 'Erreur generation PDFs');
      }

      // 2. Creer le print job Lulu
      const printJobResponse = await fetch('/api/orders/create-print-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: pendingOrder.id,
          interiorPdfUrl: pdfData.interior.signedUrl,
          coverPdfUrl: pdfData.cover.signedUrl,
          quantity: 1,
          shippingLevel: 'MAIL',
        }),
      });

      const printJobData = await printJobResponse.json();

      if (!printJobResponse.ok) {
        throw new Error(printJobData.error || 'Erreur creation commande');
      }

      // Succes - rediriger vers la page de confirmation
      router.push('/dashboard/order-book/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la commande');
      setStep('confirm');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculs pour l'affichage
  const booksUsed = profile?.additional_books_ordered || 0;
  const booksRemaining = Math.max(0, (profile?.books_included || 0) - booksUsed);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-secondary animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Chargement...</p>
        </div>
      </div>
    );
  }

  // Verifier si l'utilisateur a une commande en attente
  if (!pendingOrder && !hasIncludedBook) {
    return (
      <div className="min-h-screen bg-bg-main">
        {profile && (
          <Header user={{
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name
          }} />
        )}

        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-primary/10">
            <AlertCircle className="w-20 h-20 text-amber-500 mx-auto mb-6" />
            <h1 className="text-2xl font-heading font-bold text-text-main mb-4">
              Aucune commande de livre en attente
            </h1>
            <p className="text-text-muted mb-8">
              Pour commander un livre physique, choisissez d'abord un pack incluant un livre ou achetez un livre supplementaire.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-text-main px-6 py-3 rounded-xl font-heading font-bold transition-all"
              >
                <ArrowLeft size={20} />
                Retour
              </Link>
              <Link
                href="/start"
                className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary-hover text-white px-6 py-3 rounded-xl font-heading font-bold transition-all"
              >
                Voir les packs
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main">
      {profile && (
        <Header user={{
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name
        }} />
      )}

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard/book"
            className="p-2 rounded-xl bg-white hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={24} className="text-text-main" />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-bold text-text-main">
              Commander votre livre
            </h1>
            <p className="text-text-muted">
              {hasIncludedBook
                ? `${booksRemaining} livre(s) inclus dans votre pack - Livraison France incluse`
                : 'Livre supplementaire - Livraison France'}
            </p>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-700 font-medium">Erreur</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-[1fr_340px] gap-8">
          {/* Colonne principale */}
          <div className="space-y-6">
            {/* Etapes */}
            <div className="flex items-center gap-4 mb-8">
              <div className={`flex items-center gap-2 ${step === 'address' ? 'text-secondary' : 'text-text-muted'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step !== 'address' ? 'bg-secondary text-white' : 'bg-gray-200'
                }`}>
                  {step !== 'address' ? <Check size={16} /> : '1'}
                </div>
                <span className="text-sm font-medium">Adresse</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200">
                <div className={`h-full bg-secondary transition-all ${step !== 'address' ? 'w-full' : 'w-0'}`} />
              </div>
              <div className={`flex items-center gap-2 ${step === 'confirm' || step === 'processing' ? 'text-secondary' : 'text-text-muted'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'confirm' ? 'bg-secondary text-white' : step === 'processing' ? 'bg-secondary text-white' : 'bg-gray-200'
                }`}>
                  {step === 'processing' ? <Loader2 size={16} className="animate-spin" /> : '2'}
                </div>
                <span className="text-sm font-medium">Confirmation</span>
              </div>
            </div>

            {/* Etape 1: Adresse */}
            {step === 'address' && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <ShippingAddressForm
                  initialData={shippingAddress || undefined}
                  onSubmit={handleSaveAddress}
                  isLoading={isSubmitting || isCalculatingShipping}
                  submitLabel={isCalculatingShipping ? 'Calcul des frais...' : 'Continuer'}
                />
              </div>
            )}

            {/* Etape 2: Confirmation */}
            {(step === 'confirm' || step === 'processing') && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-heading font-bold text-text-main mb-6 flex items-center gap-2">
                  <Check className="text-secondary" size={24} />
                  Recapitulatif de votre commande
                </h3>

                {/* Adresse */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-text-muted">Livraison a :</span>
                    <button
                      onClick={() => setStep('address')}
                      className="text-sm text-secondary hover:underline"
                    >
                      Modifier
                    </button>
                  </div>
                  <p className="font-medium text-text-main">{shippingAddress?.name}</p>
                  <p className="text-sm text-text-muted">{shippingAddress?.street1}</p>
                  {shippingAddress?.street2 && (
                    <p className="text-sm text-text-muted">{shippingAddress.street2}</p>
                  )}
                  <p className="text-sm text-text-muted">
                    {shippingAddress?.postcode} {shippingAddress?.city}
                  </p>
                  <p className="text-sm text-text-muted">{shippingAddress?.country_code}</p>
                </div>

                {/* Details commande */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Livre biographie A5</span>
                    <span className="text-text-main">{hasIncludedBook ? 'Inclus dans le pack' : '23,00 EUR'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Pages estimees</span>
                    <span className="text-text-main">{pageCount} pages</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Livraison France</span>
                    <span className="text-text-main">
                      {hasIncludedBook ? (
                        <span className="text-secondary font-medium">Incluse</span>
                      ) : shippingCost ? (
                        `${shippingCost.total_cost_incl_tax.toFixed(2)} ${shippingCost.currency}`
                      ) : (
                        'Calcul...'
                      )}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between font-bold">
                    <span className="text-text-main">Total a payer</span>
                    <span className="text-secondary text-lg">
                      {hasIncludedBook
                        ? 'Deja inclus dans votre pack'
                        : `${((shippingCost?.total_cost_incl_tax || 0) + 23).toFixed(2)} EUR`}
                    </span>
                  </div>
                </div>

                {/* Bouton confirmation */}
                <button
                  onClick={handleConfirmOrder}
                  disabled={isSubmitting || step === 'processing'}
                  className="w-full py-4 bg-secondary hover:bg-secondary-hover text-white rounded-xl font-heading font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {step === 'processing' ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <Truck size={20} />
                      Confirmer la commande
                    </>
                  )}
                </button>

                <p className="text-xs text-text-muted text-center mt-4">
                  En confirmant, vous lancez l'impression de votre livre. Cette action est irreversible.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apercu livre */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-20 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center shadow-lg">
                  <Book className="text-white" size={28} />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-text-main">Mon Livre de Vie</h4>
                  <p className="text-sm text-text-muted">Format A5 - Souple mate</p>
                </div>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-text-muted">
                  <Check size={16} className="text-secondary" />
                  Impression professionnelle
                </li>
                <li className="flex items-center gap-2 text-text-muted">
                  <Check size={16} className="text-secondary" />
                  Papier ivoire 60g/m2
                </li>
                <li className="flex items-center gap-2 text-text-muted">
                  <Check size={16} className="text-secondary" />
                  Couverture souple mate
                </li>
                <li className="flex items-center gap-2 text-text-muted">
                  <Check size={16} className="text-secondary" />
                  ~{pageCount} pages
                </li>
                {hasIncludedBook && (
                  <li className="flex items-center gap-2 text-secondary font-medium">
                    <Check size={16} className="text-secondary" />
                    Livraison France incluse
                  </li>
                )}
              </ul>
            </div>

            {/* Delais */}
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
              <div className="flex items-start gap-3">
                <Package className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-amber-800">Delai de livraison (France)</p>
                  <p className="text-sm text-amber-700">
                    2-5 jours ouvres pour l'impression + 5-10 jours de livraison
                  </p>
                </div>
              </div>
            </div>

            {/* Info livraison */}
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>Livraison France metropolitaine uniquement</strong> pour le moment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
