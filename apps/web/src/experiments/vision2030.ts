export const vision2030Experiment = {
  id: 'homepage-trust-network-vision2030',
  route: '/vision2030',
  versionA: '/',
  versionB: '/vision2030',
  status: 'active-ab-test-candidate',
  featureFlag: 'VITE_EXPERIMENT_VISION_2030',
  metrics: [
    'hero_engagement',
    'timeline_node_interaction',
    'verification_cta_click',
    'time_on_experience',
    'scroll_depth',
  ],
};

export function trackVision2030Event(eventName: string, payload: Record<string, unknown> = {}) {
  // Analytics-ready no-op. Future integrations can forward this to Segment,
  // PostHog, GA4, or the platform audit/metrics API without changing callers.
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('vision2030-experiment-event', {
      detail: {
        experimentId: vision2030Experiment.id,
        eventName,
        payload,
        timestamp: new Date().toISOString(),
      },
    }),
  );
}