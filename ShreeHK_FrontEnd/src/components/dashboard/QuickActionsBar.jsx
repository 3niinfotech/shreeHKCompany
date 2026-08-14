import { ChevronRight } from "lucide-react";

const QuickActionsBar = ({ actions, onNavigate }) => (
  <div className="quick-actions-wrap">
    <div className="quick-actions">
      {actions.map((action, i) => (
        <button
          key={action.title}
          type="button"
          className={`quick-action-btn quick-action-btn--${i + 1}`}
          onClick={() => onNavigate(action.link)}
        >
          <div className="quick-action-btn__shine" aria-hidden="true" />
          <div className="action-left-icon" style={{ color: action.leftColor }}>
            {action.leftIcon}
          </div>
          <div className="action-text">
            <span className="action-title">{action.title}</span>
            <span className="action-subtitle">{action.subtitle}</span>
          </div>
          <div className="action-right-icon">
            <ChevronRight size={16} />
          </div>
        </button>
      ))}
    </div>
  </div>
);

export default QuickActionsBar;
