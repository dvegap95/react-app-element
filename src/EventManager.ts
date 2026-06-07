import React, { useState, useEffect } from 'react';

export type EventManagerProps = {
  component: React.ComponentType | string;
  eventHandler: EventTarget;
};

type PropsEvent = CustomEvent & {
  detail: {
    props: Record<string, unknown>;
  };
};

function isPropsEvent(event: Event): event is PropsEvent {
  return event.type === 'props'
    ? (event as PropsEvent).detail.props !== undefined
    : false;
}
export default function EventManager({
  component,
  eventHandler,
  ...rest
}: EventManagerProps) {
  const [props, setProps] = useState(rest);
  useEffect(() => {
    eventHandler.addEventListener('props', (event: Event) => {
      if (isPropsEvent(event)) {
        setProps((prev) => {
          return { ...prev, ...event.detail.props };
        });
      }
    });
  }, [eventHandler, props]);

  return React.createElement(component, props);
}
