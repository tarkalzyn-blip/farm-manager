import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * StackedAlerts: Container for actionable dashboard alerts
 * @param {Array} tasks - Array of task objects from useDashboardTasks
 * @param {Function} onAction - (type, cowWrapper) => void (triggers Modal)
 */
export default function StackedAlerts({ tasks = [], onAction }) {
  const navigate = useNavigate();

  if (!tasks || tasks.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="stacked-empty-state"
      >
        <div className="empty-icon">✅</div>
        <div className="empty-title">كل شيء تحت السيطرة</div>
        <div className="empty-subtitle">لا توجد مهام معلقة في الوقت الحالي.</div>
      </motion.div>
    );
  }

  const handleTaskClick = (task) => {
    if (task.actionType === 'navigate' || !task.actionType) {
        navigate(task.category === 'COWS' ? '/cows' : '/calves', { 
            state: { targetCowId: task.cow.id } 
        });
    } else {
        onAction(task.actionType, task.cowWrapper);
    }
  };

  return (
    <div className="stacked-alerts-container">
      <AnimatePresence mode="popLayout">
        {tasks.map((task, index) => (
          <AlertCard 
            key={task.id} 
            task={task} 
            index={index} 
            onClick={() => handleTaskClick(task)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function AlertCard({ task, index, onClick }) {
  const { type, icon, title, subtext, actionLabel, cow } = task;
  
  // Theme colors based on type
  const themeClass = `theme-${type}`; 

  // Mapping Arabic color names to CSS colors if necessary
  const tagColorMap = {
    'أصفر': '#ffd600',
    'أزرق': '#2196f3',
    'أحمر': '#f44336',
    'أخضر': '#4caf50',
    'برتقالي': '#ff9800',
    'أبيض': '#ffffff',
    'أسود': '#212121'
  };
  const bgColor = tagColorMap[cow.tagColor] || cow.tagColor || 'var(--ds-border-solid)';

  const renderText = (text) => {
    if (!text) return null;
    return text.split(/(\d+)/).map((part, i) => 
      /\d+/.test(part) ? <strong key={i}>{part}</strong> : part
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        opacity: { duration: 0.2 },
        layout: { duration: 0.3 }
      }}
      className={`alert-card-stacked ${themeClass}`}
    >
      {/* 1. RIGHT: ID Badge & Icon (Start of row in RTL) */}
      <div className="card-right">
        <div className="animal-smart-badge-standard">
          <span className="animal-id">{cow.id}</span>
          <div 
            className="tag-color-box" 
            style={{ backgroundColor: bgColor }} 
          />
        </div>
      </div>

      {/* 2. CENTER: Main Message (Ellipsis forced) */}
      <div className="card-center">
        <div className="task-body-text">
            {icon} <span className="task-title-main">{renderText(title)}</span>
        </div>
      </div>

      {/* 3. LEFT: Action Button (End of row in RTL) */}
      <div className="card-left">
        <button 
          className="action-pill-btn"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          {actionLabel || 'عرض'}
        </button>
      </div>
      
      {/* 4. Accent Border (Purely CSS handled) */}
      <div className="card-accent-border" />
    </motion.div>
  );
}
