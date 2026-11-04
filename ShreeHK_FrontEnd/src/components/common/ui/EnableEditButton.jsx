import React, { useState } from 'react';
import { Pencil, Lock } from 'lucide-react';

/**
 * Standard project-wide Enable / Disable Edit toggle button for Edit/View modals.
 * Premium ERP styling with micro-interactions, status dot, and dynamic theme support.
 */
const EnableEditButton = ({ isEnabled, onToggle }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isEnabled ? 'Click to lock and make fields read-only' : 'Click to enable editing'}
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
        border: isEnabled
          ? isHovered
            ? '1px solid #ea580c'
            : '1px solid rgba(234, 88, 12, 0.4)'
          : isHovered
            ? '1px solid #2563eb'
            : '1px solid rgba(37, 99, 235, 0.35)',
        backgroundColor: isEnabled
          ? isHovered
            ? 'rgba(234, 88, 12, 0.14)'
            : 'rgba(234, 88, 12, 0.08)'
          : isHovered
            ? 'rgba(37, 99, 235, 0.12)'
            : 'rgba(37, 99, 235, 0.05)',
        color: isEnabled ? '#ea580c' : '#2563eb',
        boxShadow: isHovered
          ? isEnabled
            ? '0 2px 8px rgba(234, 88, 12, 0.2)'
            : '0 2px 8px rgba(37, 99, 235, 0.18)'
          : '0 1px 2px rgba(0, 0, 0, 0.04)',
        transform: isHovered ? 'translateY(-0.5px)' : 'none',
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
