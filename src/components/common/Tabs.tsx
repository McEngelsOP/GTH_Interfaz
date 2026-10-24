import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import '../../styles/tabs.css';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  const track = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => {
      const selected = element.querySelector<HTMLElement>('[aria-selected="true"]');
      const next = { left: selected?.offsetLeft || 0, width: selected?.offsetWidth || 0 };
      setIndicator(previous => previous.left === next.left && previous.width === next.width ? previous : next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.querySelectorAll('[role="tab"]').forEach(tab => observer.observe(tab));
    return () => observer.disconnect();
  }, [activeTab, tabs]);

  return (
    <div className={`tabs-scroll ${className}`}>
      <div ref={track} role="tablist" className="tabs-track">
        <span aria-hidden="true" className="tabs-indicator"
          style={{ transform: `translateX(${indicator.left}px) scaleX(${indicator.width})`, visibility: indicator.width ? 'visible' : 'hidden' }} />
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          return <button key={tab.id} type="button" role="tab" aria-selected={isActive}
            tabIndex={isActive ? 0 : -1} className="tabs-button focus-ring"
            onClick={() => onChange(tab.id)}
            onKeyDown={event => {
              let next = index;
              if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
              else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = tabs.length - 1;
              else return;
              event.preventDefault();
              onChange(tabs[next].id);
              const target = track.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
              target?.focus({ preventScroll: true });
              target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }}>
            {tab.icon && <span className="tabs-icon">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && <span className="tabs-count">{tab.count}</span>}
          </button>;
        })}
      </div>
    </div>
  );
}
