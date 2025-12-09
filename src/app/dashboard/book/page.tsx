/**
 * PAGE BOOK
 * Lecture, visualisation et achat du livre autobiographique
 */

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function BookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Récupérer le livre de l'utilisateur (s'il existe)
  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Livre</h1>
        <p className="text-gray-600">
          Visualisez et commandez votre récit de vie
        </p>
      </div>

      {book ? (
        // L'utilisateur a déjà un livre
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Prévisualisation du livre */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Prévisualisation</h2>
            <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <div className="text-center text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <p>Couverture du livre</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Statut: <span className="font-medium">{book.status}</span>
            </p>
          </div>

          {/* Informations et commande */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-4">Informations</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-600">Titre</dt>
                  <dd className="font-medium">{book.title || 'Mon Récit de Vie'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Pages</dt>
                  <dd className="font-medium">{book.page_count || '-'} pages</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Dernière mise à jour</dt>
                  <dd className="font-medium">
                    {book.updated_at ? new Date(book.updated_at).toLocaleDateString('fr-FR') : '-'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-4">Commander</h2>
              <p className="text-gray-600 mb-6">
                Commandez votre livre imprimé en haute qualité
              </p>
              <div className="space-y-4">
                <button className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-medium">
                  Commander (Version Papier)
                </button>
                <button className="w-full border-2 border-purple-600 text-purple-600 py-3 rounded-lg hover:bg-purple-50 transition font-medium">
                  Télécharger (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Pas encore de livre
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <svg
            className="w-20 h-20 mx-auto mb-4 text-gray-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
          <h2 className="text-2xl font-bold mb-4">Votre livre n'est pas encore prêt</h2>
          <p className="text-gray-600 mb-8">
            Continuez à raconter votre histoire dans les différentes ères de votre vie pour générer votre livre.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
          >
            Retour à ma Fresque
          </button>
        </div>
      )}
    </div>
  )
}
