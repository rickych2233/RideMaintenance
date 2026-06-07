import React, { useState } from 'react';

const CHECKLIST_ITEMS = [
  { id: 'tires', category: 'Tires & Wheels', label: 'Air pressure, tread depth, rims/spokes check', desc: 'Ensure tire pressure is adequate and there are no punctures or cracks.' },
  { id: 'brakes', category: 'Controls', label: 'Front & rear brakes, throttle responsive', desc: 'Brake levers should feel firm. Throttle must snap back when released.' },
  { id: 'lights', category: 'Lights & Electrics', label: 'Headlight, brake light, turn signals, horn', desc: 'Test all switches. Turn signals should blink correctly, brake light triggers on both controls.' },
  { id: 'fluids', category: 'Oil & Fluids', label: 'Engine oil, brake fluids, coolant levels', desc: 'Check for visible leaks under the vehicle and verify fluid reservoirs are filled.' },
  { id: 'chassis', category: 'Chassis & Stand', label: 'Suspension, side stand, center stand spring', desc: 'Verify side stand retracts fully and holds vehicle stably.' }
];

export default function RideChecklist({ vehicle, onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState('');

  const currentItem = CHECKLIST_ITEMS[currentStep];

  const handleSelect = (status) => {
    setAnswers(prev => ({
      ...prev,
      [currentItem.id]: status
    }));

    // Auto-advance after selecting (unless it is the last item)
    if (currentStep < CHECKLIST_ITEMS.length - 1) {
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 300);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < CHECKLIST_ITEMS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSubmit = () => {
    // Check if all items are filled
    const allAnswered = CHECKLIST_ITEMS.every(item => answers[item.id] !== undefined);
    if (!allAnswered) {
      alert('Please inspect all safety checklist items before starting your ride.');
      return;
    }

    // Calculate safety score
    const passedCount = CHECKLIST_ITEMS.filter(item => answers[item.id] === 'pass').length;
    const safetyScore = Math.round((passedCount / CHECKLIST_ITEMS.length) * 100);

    onComplete({
      checklistAnswers: answers,
      safetyScore,
      checklistNotes: notes,
      timestamp: new Date().toISOString()
    });
  };

  const isCompleted = CHECKLIST_ITEMS.every(item => answers[item.id] !== undefined);

  return (
    <div className="checklist-container glass-panel">
      <div className="checklist-step-header">
        <div>
          <h2 style={{ fontSize: '22px' }}>Pre-Ride Safety Check</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
            Inspecting: <span style={{ color: 'var(--cyan)' }}>{vehicle?.name}</span>
          </p>
        </div>
        <span className="step-indicator">
          Step {currentStep + 1} of {CHECKLIST_ITEMS.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="maintenance-progress-bar" style={{ marginBottom: '24px' }}>
        <div 
          className="maintenance-progress-fill" 
          style={{ width: `${((currentStep + 1) / CHECKLIST_ITEMS.length) * 100}%` }}
        />
      </div>

      {/* Checklist Card */}
      <div 
        style={{ 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '24px', 
          marginBottom: '24px'
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--violet)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {currentItem.category}
        </span>
        <h3 style={{ fontSize: '20px', marginTop: '4px', marginBottom: '8px' }}>{currentItem.label}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>{currentItem.desc}</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '28px' }}>
          <button 
            className={`btn-option pass ${answers[currentItem.id] === 'pass' ? 'active' : ''}`}
            onClick={() => handleSelect('pass')}
            style={{ width: '80px', height: '60px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}
          >
            <span>✓</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>PASS</span>
          </button>
          <button 
            className={`btn-option fail ${answers[currentItem.id] === 'fail' ? 'active' : ''}`}
            onClick={() => handleSelect('fail')}
            style={{ width: '80px', height: '60px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}
          >
            <span>✗</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>FLAG</span>
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          className="btn btn-secondary" 
          onClick={handleBack} 
          disabled={currentStep === 0}
          style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }}
        >
          Previous
        </button>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          {currentStep < CHECKLIST_ITEMS.length - 1 ? (
            <button 
              className="btn btn-secondary" 
              onClick={handleNext}
              disabled={answers[currentItem.id] === undefined}
            >
              Next
            </button>
          ) : (
            <button 
              className="btn btn-success" 
              onClick={handleSubmit}
              disabled={!isCompleted}
            >
              Proceed to Ride ⚡
            </button>
          )}
        </div>
      </div>

      {/* Sidebar: Overall Checklist Status */}
      <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>Checklist Overview</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          {CHECKLIST_ITEMS.map((item, idx) => {
            const ans = answers[item.id];
            let dotBg = 'rgba(255, 255, 255, 0.05)';
            let dotBorder = 'var(--border-color)';
            if (ans === 'pass') {
              dotBg = 'rgba(16, 185, 129, 0.2)';
              dotBorder = 'var(--emerald)';
            } else if (ans === 'fail') {
              dotBg = 'rgba(239, 68, 68, 0.2)';
              dotBorder = 'var(--red)';
            } else if (idx === currentStep) {
              dotBg = 'rgba(0, 242, 254, 0.1)';
              dotBorder = 'var(--cyan)';
            }

            return (
              <div 
                key={item.id}
                onClick={() => setCurrentStep(idx)}
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  padding: '8px 4px', 
                  background: dotBg, 
                  border: `1px solid ${dotBorder}`, 
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600'
                }}
              >
                {item.id.toUpperCase()}
              </div>
            );
          })}
        </div>

        {isCompleted && (
          <div style={{ marginTop: '20px' }}>
            <label className="form-label">Inspection Notes (Optional)</label>
            <textarea 
              className="form-control" 
              rows="2" 
              placeholder="Describe any flagged components or check-in notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
