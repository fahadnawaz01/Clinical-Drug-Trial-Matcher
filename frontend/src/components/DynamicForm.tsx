import { useState } from 'react';
import type { FormField } from '../types/api';
import '../styles/DynamicForm.css';

interface DynamicFormProps {
  fields: FormField[];
  provisionalScore?: number;
  onSubmit: (answers: Record<string, string | number | boolean>, fields: FormField[]) => void;
}

function DynamicForm({ fields, provisionalScore, onSubmit }: DynamicFormProps) {
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (fieldId: string, value: string | number | boolean) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      if (answers[field.id] === undefined || answers[field.id] === '') {
        newErrors[field.id] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(answers, fields);
    }
  };

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.id];
    
    // Determine hint color based on content
    const getHintClass = (placeholder?: string) => {
      if (!placeholder) return 'dynamic-form__hint';
      if (placeholder.includes('INCLUSION')) return 'dynamic-form__hint dynamic-form__hint--inclusion';
      if (placeholder.includes('EXCLUSION')) return 'dynamic-form__hint dynamic-form__hint--exclusion';
      return 'dynamic-form__hint';
    };

    switch (field.type) {
      case 'boolean':
      case 'radio':
        return (
          <div className="dynamic-form__field-group" key={field.id}>
            <label className="dynamic-form__label">
              {field.label}
              {field.placeholder && (
                <span className={getHintClass(field.placeholder)}>{field.placeholder}</span>
              )}
            </label>
            <div className="dynamic-form__radio-group">
              {field.options?.map(option => (
                <label key={option} className="dynamic-form__radio-label">
                  <input
                    type="radio"
                    name={field.id}
                    value={option}
                    checked={answers[field.id] === option}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    className="dynamic-form__radio"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {hasError && <span className="dynamic-form__error">{errors[field.id]}</span>}
          </div>
        );

      case 'number':
        return (
          <div className="dynamic-form__field-group" key={field.id}>
            <label className="dynamic-form__label" htmlFor={field.id}>
              {field.label}
              {field.placeholder && (
                <span className={getHintClass(field.placeholder)}>{field.placeholder}</span>
              )}
            </label>
            <input
              type="number"
              id={field.id}
              value={answers[field.id] as number || ''}
              onChange={(e) => handleChange(field.id, parseFloat(e.target.value))}
              className={`dynamic-form__input ${hasError ? 'dynamic-form__input--error' : ''}`}
              step="0.01"
            />
            {hasError && <span className="dynamic-form__error">{errors[field.id]}</span>}
          </div>
        );

      case 'textarea':
        return (
          <div className="dynamic-form__field-group" key={field.id}>
            <label className="dynamic-form__label" htmlFor={field.id}>
              {field.label}
              {field.placeholder && (
                <span className={getHintClass(field.placeholder)}>{field.placeholder}</span>
              )}
            </label>
            <textarea
              id={field.id}
              value={answers[field.id] as string || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className={`dynamic-form__textarea ${hasError ? 'dynamic-form__textarea--error' : ''}`}
              rows={3}
            />
            {hasError && <span className="dynamic-form__error">{errors[field.id]}</span>}
          </div>
        );

      case 'dropdown':
      case 'select':
        return (
          <div className="dynamic-form__field-group" key={field.id}>
            <label className="dynamic-form__label" htmlFor={field.id}>
              {field.label}
              {field.placeholder && (
                <span className={getHintClass(field.placeholder)}>{field.placeholder}</span>
              )}
            </label>
            <select
              id={field.id}
              value={answers[field.id] as string || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className={`dynamic-form__select ${hasError ? 'dynamic-form__select--error' : ''}`}
            >
              <option value="">{field.placeholder || 'Select an option'}</option>
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {hasError && <span className="dynamic-form__error">{errors[field.id]}</span>}
          </div>
        );

      default: // text
        return (
          <div className="dynamic-form__field-group" key={field.id}>
            <label className="dynamic-form__label" htmlFor={field.id}>
              {field.label}
              {field.placeholder && (
                <span className={getHintClass(field.placeholder)}>{field.placeholder}</span>
              )}
            </label>
            <input
              type="text"
              id={field.id}
              value={answers[field.id] as string || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className={`dynamic-form__input ${hasError ? 'dynamic-form__input--error' : ''}`}
            />
            {hasError && <span className="dynamic-form__error">{errors[field.id]}</span>}
          </div>
        );
    }
  };

  return (
    <div className="dynamic-form">
      {provisionalScore !== undefined && (
        <div className="dynamic-form__score-banner">
          <div className="dynamic-form__score-label">Provisional Fit Score</div>
          <div className="dynamic-form__score-value">{provisionalScore}/100</div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="dynamic-form__form">
        <div className="dynamic-form__fields">
          {fields.map(field => renderField(field))}
        </div>
        
        <button type="submit" className="dynamic-form__submit-btn">
          Submit Answers
        </button>
      </form>
    </div>
  );
}

export default DynamicForm;
