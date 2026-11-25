import { track } from '@vercel/analytics';

/** Every custom event, so the names stay in one place. Never send sheet ids or addresses. */
export type AnalyticsEvent =
  | 'sheet_submitted'
  | 'recent_sheet_selected'
  | 'recent_sheet_removed'
  | 'template_clicked'
  | 'sample_trip_opened'
  | 'setup_guide_opened'
  | 'sheet_loaded'
  | 'sheet_load_failed'
  | 'day_selected'
  | 'whole_trip_shown'
  | 'overview_toggled'
  | 'replay_started'
  | 'day_load_toggled'
  | 'data_reloaded'
  | 'map_size_changed'
  | 'source_sheet_opened'
  | 'screenshot_taken'
  | 'export_started'
  | 'export_completed'
  | 'export_cancelled';

export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>,
) {
  try {
    track(event, properties);
  } catch {
    // Analytics must never break the app
  }
}
