import React, { useState } from 'react';
import { Pencil, Lock } from 'lucide-react';

/**
 * Standard project-wide Enable / Disable Edit toggle button for Edit/View modals.
 * Premium ERP styling with micro-interactions, status dot, and dynamic theme support.
 */
const EnableEditButton = ({ isEnabled, onToggle, variant = 'default', className = '', style = {} }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isOnDark = variant === 'onDark';

  const border = isOnDark
    ? isEnabled
      ? isHovered
        ? '1px solid #ea580c'
        : '1px solid rgba(234, 88, 12, 0.6)'
      : isHovered
        ? '1px solid rgba(255, 255, 255, 1)'
        : '1px solid rgba(255, 255, 255, 0.85)'
    : isEnabled
      ? isHovered
        ? '1px solid #ea580c'
        : '1px solid rgba(234, 88, 12, 0.4)'
      : isHovered
        ? '1px solid #0d7b6b'
        : '1px solid rgba(13, 123, 107, 0.35)';

  const backgroundColor = isOnDark
    ? isEnabled
      ? isHovered
        ? '#fff7ed'
        : '#ffffff'
      : isHovered
        ? '#ffffff'
        : 'rgba(255, 255, 255, 0.95)'
    : isEnabled
      ? isHovered
        ? 'rgba(234, 88, 12, 0.14)'
        : 'rgba(234, 88, 12, 0.08)'
      : isHovered
        ? 'rgba(13, 123, 107, 0.12)'
        : 'rgba(13, 123, 107, 0.05)';

  const color = isOnDark
    ? isEnabled ? '#c2410c' : '#0d7b6b'
    : isEnabled ? '#ea580c' : '#0d7b6b';

  const boxShadow = isOnDark
    ? isHovered
      ? isEnabled
        ? '0 4px 12px rgba(234, 88, 12, 0.28)'
        : '0 4px 12px rgba(0, 0, 0, 0.24)'
      : isEnabled
        ? '0 2px 6px rgba(234, 88, 12, 0.16)'
        : '0 2px 6px rgba(0, 0, 0, 0.15)'
    : isHovered
      ? isEnabled
        ? '0 2px 8px rgba(234, 88, 12, 0.2)'
        : '0 2px 8px rgba(13, 123, 107, 0.18)'
      : '0 1px 2px rgba(0, 0, 0, 0.04)';

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isEnabled ? 'Click to lock and make fields read-only' : 'Click to enable editing'}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        fontSize: '11.5px',
        fontWeight: 600,
        letterSpacing: '0.25px',
        lineHeight: 1.4,
        borderRadius: '20px',
        cursor: 'pointer',
        userSelect: 'none',
        outline: 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        border,
        backgroundColor,
        color,
        boxShadow,
        transform: isHovered ? 'translateY(-0.5px)' : 'none',
        ...style,
      }}
    >
      {isEnabled ? (
        <>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#ea580c',
              boxShadow: '0 0 0 2px rgba(234, 88, 12, 0.25)',
              display: 'inline-block',
            }}
          />
          <Lock size={12} strokeWidth={2.4} />
          <span>Disable Edit</span>
        </>
      ) : (
        <>
          <Pencil size={12} strokeWidth={2.4} />
          <span>Enable Edit</span>
        </>
      )}
    </button>
  );
};

export default EnableEditButton;
