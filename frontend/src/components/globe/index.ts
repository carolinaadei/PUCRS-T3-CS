import { lazy } from 'react';

// three.js é pesado: os globos ficam num pedaço separado, carregado sob demanda.
export const ExploreGlobe = lazy(() => import('./Globes').then((m) => ({ default: m.ExploreGlobe })));
export const TripGlobe = lazy(() => import('./Globes').then((m) => ({ default: m.TripGlobe })));
export const VisitedGlobe = lazy(() => import('./Globes').then((m) => ({ default: m.VisitedGlobe })));
export type { ParadaGlobo } from './Globes';
