const CHECK_ICON = `
  <svg class="stop-marker__check" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

export type StopMarkerVariant = 'completed' | 'current' | 'upcoming';

export const createStopMarkerElement = (index: number, variant: StopMarkerVariant): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = `stop-marker stop-marker--${variant}`;
  el.style.width = '36px';
  el.style.height = '44px';
  el.style.position = 'relative';
  el.style.pointerEvents = 'auto';
  el.title = variant === 'completed' ? `תחנה ${index + 1} — בוצעה` : `תחנה ${index + 1}`;

  if (variant === 'completed') {
    el.innerHTML = `
      <div class="stop-marker__pin stop-marker__pin--done">
        ${CHECK_ICON}
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="stop-marker__pin">
        <span class="stop-marker__number">${index + 1}</span>
      </div>
      ${variant === 'current' ? '<span class="stop-marker__pulse"></span>' : ''}
    `;
  }

  return el;
};

export const getStopMarkerVariant = (
  stop: { completed?: boolean },
  index: number,
  currentStopIndex: number,
  isNavigating: boolean,
): StopMarkerVariant => {
  if (stop.completed) return 'completed';
  if (isNavigating && index === currentStopIndex) return 'current';
  return 'upcoming';
};
