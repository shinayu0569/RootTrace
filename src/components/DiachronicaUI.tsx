import React from 'react';
import { useDiachronicaAttestation } from '../hooks/useDiachronica';

interface DiachronicaAttestationBadgeProps {
  protoPhoneme: string;
  reflexPhoneme: string;
  leftContext?: string | null;
  rightContext?: string | null;
  showDetails?: boolean;
}

/**
 * Badge component showing Index Diachronica attestation status
 */
export const DiachronicaAttestationBadge: React.FC<DiachronicaAttestationBadgeProps> = ({
  protoPhoneme,
  reflexPhoneme,
  leftContext = null,
  rightContext = null,
  showDetails = false
}) => {
  const { info, loading } = useDiachronicaAttestation(protoPhoneme, reflexPhoneme, {
    leftContext,
    rightContext
  });

  if (loading) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 animate-pulse">
        <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Checking...
      </span>
    );
  }

  if (!info || !info.isAttested) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        Not in Diachronica
      </span>
    );
  }

  // Color based on attestation strength
  const getBadgeColor = () => {
    if (info.attestationCount >= 100) return 'bg-green-100 text-green-800';
    if (info.attestationCount >= 20) return 'bg-blue-100 text-blue-800';
    if (info.attestationCount >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-orange-100 text-orange-800';
  };

  return (
    <div className="inline-flex flex-col">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getBadgeColor()}`}>
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {info.attestationCount} attestations
      </span>
      
      {showDetails && (
        <div className="mt-1 text-xs text-gray-600">
          {info.languageFamilies.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {info.languageFamilies.slice(0, 3).map(family => (
                <span key={family} className="px-1 bg-gray-100 rounded">
                  {family}
                </span>
              ))}
              {info.languageFamilies.length > 3 && (
                <span className="text-gray-400">+{info.languageFamilies.length - 3} more</span>
              )}
            </div>
          )}
          {info.environments.length > 0 && (
            <div className="mt-1 text-gray-500">
              Envs: {info.environments.slice(0, 2).join(', ')}
              {info.environments.length > 2 && ` +${info.environments.length - 2}`}
            </div>
          )}
          <div className="mt-1 text-green-600 font-medium">
            Bonus: +{info.bonus.toFixed(3)}
          </div>
        </div>
      )}
    </div>
  );
};

interface SoundChangeDetailProps {
  protoPhoneme: string;
  reflexPhoneme: string;
  leftContext?: string | null;
  rightContext?: string | null;
}

/**
 * Detailed view of a sound change with Diachronica verification
 */
export const SoundChangeDetail: React.FC<SoundChangeDetailProps> = ({
  protoPhoneme,
  reflexPhoneme,
  leftContext,
  rightContext
}) => {
  const { info, loading, error } = useDiachronicaAttestation(protoPhoneme, reflexPhoneme, {
    leftContext,
    rightContext
  });

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg text-red-600 text-sm">
        Error checking Diachronica: {error.message}
      </div>
    );
  }

  if (!info || !info.isAttested) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <strong>*{protoPhoneme} → {reflexPhoneme}</strong>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Not attested in Index Diachronica
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-900">
          <strong>*{protoPhoneme} → {reflexPhoneme}</strong>
        </div>
        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
          {info.attestationCount} attestations
        </span>
      </div>
      
      <div className="space-y-2 text-xs">
        {info.languageFamilies.length > 0 && (
          <div>
            <span className="text-gray-500">Language families:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {info.languageFamilies.map(family => (
                <span key={family} className="px-2 py-0.5 bg-white rounded border border-gray-200">
                  {family}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {info.environments.length > 0 && (
          <div>
            <span className="text-gray-500">Attested environments:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {info.environments.map(env => (
                <code key={env} className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                  {env}
                </code>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t border-green-200">
          <span className="text-gray-500">Reconstruction bonus:</span>
          <span className="font-medium text-green-700">+{info.bonus.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
};

interface DiachronicaSearchPanelProps {
  onSelectChange?: (proto: string, reflex: string) => void;
}

/**
 * Panel for searching Index Diachronica sound changes
 */
export const DiachronicaSearchPanel: React.FC<DiachronicaSearchPanelProps> = ({
  onSelectChange
}) => {
  const [proto, setProto] = React.useState('');
  const [reflex, setReflex] = React.useState('');
  
  const { info, loading } = useDiachronicaAttestation(proto, reflex, {
    enabled: proto.length > 0 && reflex.length > 0
  });

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Index Diachronica Search
      </h3>
      
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={proto}
          onChange={(e) => setProto(e.target.value)}
          placeholder="Proto (e.g., t)"
          className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-400">→</span>
        <input
          type="text"
          value={reflex}
          onChange={(e) => setReflex(e.target.value)}
          placeholder="Reflex (e.g., s)"
          className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && (
        <div className="text-sm text-gray-500">Searching...</div>
      )}

      {info && info.isAttested && (
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">{info.attestationCount}</span> attested examples
          </div>
          {info.languageFamilies.length > 0 && (
            <div className="text-xs text-gray-600">
              Found in: {info.languageFamilies.join(', ')}
            </div>
          )}
          {onSelectChange && (
            <button
              onClick={() => onSelectChange(proto, reflex)}
              className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Use in Reconstruction
            </button>
          )}
        </div>
      )}

      {info && !info.isAttested && proto && reflex && (
        <div className="text-sm text-gray-500">
          No attestations found for *{proto} → {reflex}
        </div>
      )}
    </div>
  );
};
