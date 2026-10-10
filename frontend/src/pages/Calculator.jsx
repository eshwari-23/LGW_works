import React, { useState, useEffect } from 'react';
import api from '../api';
import './Calculator.css';

const SERVICES = [
  { value: 'stairs', label: 'Stairs' },
  { value: 'gates', label: 'Gates' },
  { value: 'doors', label: 'Doors' },
  { value: 'windows', label: 'Windows' },
  { value: 'fencing', label: 'Fencing' },
  { value: 'shutters', label: 'Shutters' },
  { value: 'sheds', label: 'Sheds' }
];

const Calculator = () => {
  const [service, setService] = useState('stairs');
  const [materials, setMaterials] = useState([]);
  const [serviceConfig, setServiceConfig] = useState({});
  const [formData, setFormData] = useState({
    material: '',
    weight: '',
    units: '',
    includeInstallation: false
  });
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load service config once
  useEffect(() => {
    api.get('/api/services').then(res => setServiceConfig(res.data)).catch(console.error);
  }, []);

  // Load materials when service changes
  useEffect(() => {
    setBreakdown(null);
    setFormData(prev => ({ ...prev, material: '', weight: '', units: '' }));
    api.get(`/api/pricing/${service}`)
      .then(res => {
        setMaterials(res.data);
        if (res.data.length > 0) {
          setFormData(prev => ({ ...prev, material: res.data[0].material }));
        }
      })
      .catch(console.error);
  }, [service]);

  const config = serviceConfig[service] || { hasUnits: false, unitLabel: '' };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calculate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/calculate', {
        service,
        material: formData.material,
        weight: parseFloat(formData.weight) || 0,
        units: parseInt(formData.units) || 0,
        includeInstallation: formData.includeInstallation
      });
      setBreakdown(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const saveQuote = async () => {
    const name = prompt('Enter your name:');
    if (!name) return;
    const email = prompt('Enter your email:');
    const phone = prompt('Enter your phone:');

    try {
      await api.post('/api/quotes', {
        customer_name: name,
        email,
        phone,
        category: service,
        description: `${breakdown.material} - ${breakdown.totalWeight}kg${config.hasUnits ? ` (${breakdown.units} units)` : ''}`,
        weight: breakdown.totalWeight,
        units: breakdown.units,
        estimated_cost: breakdown.breakdown.total
      });
      alert('Quote request submitted! We will contact you soon.');
    } catch (err) {
      alert('Failed to submit quote.');
    }
  };

  return (
    <div className="calculator-page">
      <div className="page-header">
        <h1>Cost Calculator</h1>
        <p>Get an instant estimate for your fabrication project</p>
      </div>

      <div className="calculator-container">
        <form className="calc-form" onSubmit={calculate}>
          <h2>Project Details</h2>

          <div className="form-group">
            <label>Service Type</label>
            <select value={service} onChange={(e) => setService(e.target.value)}>
              {SERVICES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Material</label>
            <select
              name="material"
              value={formData.material}
              onChange={handleChange}
              required
            >
              {materials.length === 0 ? (
                <option value="">No materials available</option>
              ) : (
                materials.map(m => (
                  <option key={m.id} value={m.material}>
                    {m.material} (₹{m.price_per_kg}/kg)
                  </option>
                ))
              )}
            </select>
          </div>

          <div className={config.hasUnits ? 'form-row' : ''}>
            <div className="form-group">
              <label>
                {config.hasUnits ? 'Weight per Unit (kg)' : 'Total Weight (kg)'}
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g. 50"
                min="0"
                step="0.1"
                required
              />
            </div>

            {config.hasUnits && (
              <div className="form-group">
                <label>{config.unitLabel}</label>
                <input
                  type="number"
                  name="units"
                  value={formData.units}
                  onChange={handleChange}
                  placeholder="e.g. 2"
                  min="1"
                  required
                />
              </div>
            )}
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="includeInstallation"
                checked={formData.includeInstallation}
                onChange={handleChange}
              />
              Include Installation (15% extra)
            </label>
          </div>

          <button
            type="submit"
            className="calc-btn"
            disabled={loading || materials.length === 0}
          >
            {loading ? 'Calculating...' : 'Calculate Cost'}
          </button>
        </form>

        {breakdown && (
          <div className="result-panel">
            <h2>Cost Breakdown</h2>

            <div className="result-row">
              <span>Service:</span>
              <span style={{ textTransform: 'capitalize' }}>{breakdown.service}</span>
            </div>
            <div className="result-row">
              <span>Material:</span>
              <span>{breakdown.material}</span>
            </div>
            <div className="result-row">
              <span>Rate:</span>
              <span>₹{breakdown.price_per_kg}/kg</span>
            </div>

            {breakdown.hasUnits && (
              <>
                <div className="result-row">
                  <span>Weight per unit:</span>
                  <span>{breakdown.weightPerUnit} kg</span>
                </div>
                <div className="result-row">
                  <span>Units:</span>
                  <span>{breakdown.units}</span>
                </div>
                <div className="result-row">
                  <span>Total weight:</span>
                  <span>{breakdown.totalWeight} kg</span>
                </div>
              </>
            )}

            {!breakdown.hasUnits && (
              <div className="result-row">
                <span>Total weight:</span>
                <span>{breakdown.totalWeight} kg</span>
              </div>
            )}

            <hr />

            <div className="result-row">
              <span>Weight Cost:</span>
              <span>₹{breakdown.breakdown.weightCost.toFixed(2)}</span>
            </div>

            {breakdown.breakdown.installation > 0 && (
              <div className="result-row">
                <span>Installation (15%):</span>
                <span>₹{breakdown.breakdown.installation.toFixed(2)}</span>
              </div>
            )}

            <div className="result-row">
              <span>Subtotal:</span>
              <span>₹{breakdown.breakdown.subtotal.toFixed(2)}</span>
            </div>
            <div className="result-row">
              <span>GST (18%):</span>
              <span>₹{breakdown.breakdown.tax.toFixed(2)}</span>
            </div>

            <hr />

            <div className="result-row total">
              <span>Total Estimate:</span>
              <span>₹{breakdown.breakdown.total.toFixed(2)}</span>
            </div>

            <button className="save-btn" onClick={saveQuote}>
              Request This Quote
            </button>
            <p className="note">* Final price may vary based on design complexity</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calculator;