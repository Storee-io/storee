import React from 'react';

interface TipProps {
  label: string | React.ReactNode;
  children: React.ReactElement;
}

export function Tip({ label, children }: TipProps) {
  // Add title attribute to the child element for browser native tooltip
  const child = React.cloneElement(children, {
    title: typeof label === 'string' ? label : undefined,
    'data-tooltip': typeof label === 'string' ? label : undefined,
  } as any);

  return child;
}
