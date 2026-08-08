import React from 'react';

// Helper to normalize strings for mapping
const normalizeKey = (str) => {
  if (!str) return '';
  return str
    .toString()
    .toUpperCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[\s-]/g, '_');
};

const STATUS_CONFIG = {
  INGRESO: {
    label: 'Ingreso',
    classes: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  EN_DIAGNOSTICO: {
    label: 'En Diagnóstico',
    classes: 'bg-cyan-50 text-cyan-800 border-cyan-200'
  },
  PRESUPUESTADO: {
    label: 'Presupuestado',
    classes: 'bg-purple-50 text-purple-800 border-purple-200'
  },
  ESPERANDO_REPUESTO: {
    label: 'Esperando Repuesto',
    classes: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  EN_PRUEBAS: {
    label: 'En Pruebas',
    classes: 'bg-blue-50 text-blue-800 border-blue-200'
  },
  LISTO: {
    label: 'Listo',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
  },
  ENTREGADO: {
    label: 'Entregado',
    classes: 'bg-slate-100 text-slate-600 border-slate-200'
  }
};

const PRIORITY_CONFIG = {
  BAJA: {
    label: 'Baja',
    dotClass: 'bg-gray-400',
    textClass: 'text-gray-700',
    containerClass: 'bg-gray-50 border-gray-200'
  },
  MEDIA: {
    label: 'Media',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-700',
    containerClass: 'bg-blue-50 border-blue-200'
  },
  ALTA: {
    label: 'Alta',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700',
    containerClass: 'bg-amber-50 border-amber-200'
  },
  URGENTE: {
    label: 'Urgente',
    dotClass: 'bg-red-600',
    textClass: 'text-red-800 font-bold uppercase tracking-wider',
    containerClass: 'bg-red-50 border-red-200 animate-pulse shadow-sm shadow-red-100'
  }
};

/**
 * Componente que renderiza un badge con bordes y colores suaves para el estado.
 * @param {Object} props
 * @param {string} props.status - Estado de la orden ('INGRESO', 'EN_DIAGNOSTICO', etc.)
 */
export const StatusBadge = ({ status }) => {
  const key = normalizeKey(status);
  const config = STATUS_CONFIG[key] || {
    label: status || 'Desconocido',
    classes: 'bg-gray-50 text-gray-500 border-gray-200'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}>
      {config.label}
    </span>
  );
};

/**
 * Componente que renderiza un badge con un punto de color y texto según la prioridad.
 * @param {Object} props
 * @param {string} props.priority - Prioridad de la orden ('BAJA', 'MEDIA', etc.)
 */
export const PriorityBadge = ({ priority }) => {
  const key = normalizeKey(priority);
  const config = PRIORITY_CONFIG[key] || {
    label: priority || 'Sin prioridad',
    dotClass: 'bg-gray-300',
    textClass: 'text-gray-500',
    containerClass: 'bg-gray-50 border-gray-100'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.containerClass}`}>
      <span className="relative flex h-2 w-2">
        {key === 'URGENTE' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${key === 'URGENTE' ? 'bg-red-600' : config.dotClass}`}></span>
      </span>
      <span className={config.textClass}>{config.label}</span>
    </span>
  );
};
