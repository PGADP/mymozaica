'use client';

import { useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

interface ShippingAddressData {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  postcode: string;
  phone_number: string;
}

interface ShippingAddressFormProps {
  initialData?: Partial<ShippingAddressData>;
  onSubmit: (data: ShippingAddressData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

// Pour le moment, livraison France uniquement
const COUNTRIES = [
  { code: 'FR', name: 'France' },
];

export default function ShippingAddressForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Enregistrer',
}: ShippingAddressFormProps) {
  const [formData, setFormData] = useState<ShippingAddressData>({
    name: initialData?.name || '',
    street1: initialData?.street1 || '',
    street2: initialData?.street2 || '',
    city: initialData?.city || '',
    state_code: initialData?.state_code || '',
    country_code: initialData?.country_code || 'FR',
    postcode: initialData?.postcode || '',
    phone_number: initialData?.phone_number || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nom requis';
    }
    if (!formData.street1.trim()) {
      newErrors.street1 = 'Adresse requise';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'Ville requise';
    }
    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Code postal requis';
    }
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Telephone requis (pour le transporteur)';
    } else if (!/^[+]?[\d\s()-]{8,20}$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Format de telephone invalide';
    }

    // Validation specifique US/CA
    if (['US', 'CA'].includes(formData.country_code) && !formData.state_code?.trim()) {
      newErrors.state_code = 'Etat/Province requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    await onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Effacer l'erreur quand l'utilisateur tape
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const needsStateCode = ['US', 'CA'].includes(formData.country_code);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="text-primary" size={24} />
        <h3 className="text-lg font-heading font-bold text-text-main">
          Adresse de livraison
        </h3>
      </div>

      {/* Nom complet */}
      <div>
        <label className="block text-sm font-medium text-text-main mb-1.5">
          Nom complet *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Jean Dupont"
          className={`w-full px-4 py-3 rounded-xl border ${
            errors.name ? 'border-red-500' : 'border-gray-200'
          } focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all`}
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      {/* Adresse ligne 1 */}
      <div>
        <label className="block text-sm font-medium text-text-main mb-1.5">
          Adresse *
        </label>
        <input
          type="text"
          name="street1"
          value={formData.street1}
          onChange={handleChange}
          placeholder="123 Rue de la Paix"
          className={`w-full px-4 py-3 rounded-xl border ${
            errors.street1 ? 'border-red-500' : 'border-gray-200'
          } focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all`}
        />
        {errors.street1 && (
          <p className="text-red-500 text-xs mt-1">{errors.street1}</p>
        )}
      </div>

      {/* Adresse ligne 2 */}
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1.5">
          Complement d'adresse
        </label>
        <input
          type="text"
          name="street2"
          value={formData.street2}
          onChange={handleChange}
          placeholder="Appartement, batiment, etc."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
        />
      </div>

      {/* Ville et Code postal */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-main mb-1.5">
            Code postal *
          </label>
          <input
            type="text"
            name="postcode"
            value={formData.postcode}
            onChange={handleChange}
            placeholder="75001"
            className={`w-full px-4 py-3 rounded-xl border ${
              errors.postcode ? 'border-red-500' : 'border-gray-200'
            } focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all`}
          />
          {errors.postcode && (
            <p className="text-red-500 text-xs mt-1">{errors.postcode}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-main mb-1.5">
            Ville *
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Paris"
            className={`w-full px-4 py-3 rounded-xl border ${
              errors.city ? 'border-red-500' : 'border-gray-200'
            } focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all`}
          />
          {errors.city && (
            <p className="text-red-500 text-xs mt-1">{errors.city}</p>
          )}
        </div>
      </div>

      {/* Pays */}
      <div>
        <label className="block text-sm font-medium text-text-main mb-1.5">
          Pays *
        </label>
        <select
          name="country_code"
          value={formData.country_code}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all bg-white"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {/* Etat/Province (pour US/CA) */}
      {needsStateCode && (
        <div>
          <label className="block text-sm font-medium text-text-main mb-1.5">
            Etat / Province *
          </label>
          <input
            type="text"
            name="state_code"
            value={formData.state_code}
            onChange={handleChange}
            placeholder={formData.country_code === 'US' ? 'CA, NY, TX...' : 'QC, ON, BC...'}
            maxLength={3}
            className={`w-full px-4 py-3 rounded-xl border ${
              errors.state_code ? 'border-red-500' : 'border-gray-200'
            } focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all`}
          />
          {errors.state_code && (
            <p className="text-red-500 text-xs mt-1">{errors.state_code}</p>
          )}
        </div>
      )}

      {/* Telephone */}
      <div>
        <label className="block text-sm font-medium text-text-main mb-1.5">
          Telephone *
        </label>
        <input
          type="tel"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          placeholder="+33 6 12 34 56 78"
          className={`w-full px-4 py-3 rounded-xl border ${
            errors.phone_number ? 'border-red-500' : 'border-gray-200'
          } focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all`}
        />
        {errors.phone_number && (
          <p className="text-red-500 text-xs mt-1">{errors.phone_number}</p>
        )}
        <p className="text-xs text-text-muted mt-1">
          Le transporteur peut avoir besoin de vous contacter
        </p>
      </div>

      {/* Bouton submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 bg-secondary hover:bg-secondary-hover text-white rounded-xl font-heading font-bold text-base flex items-center justify-center gap-2 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Enregistrement...
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}
