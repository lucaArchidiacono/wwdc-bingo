import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

export default function AdminLogin() {
  const [username, setUsername] = useState('admin');
  const [token, setToken] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const qc = useQueryClient();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/api/auth/admin-signup', {
        username: username.trim(),
        bootstrapToken: token,
      });
      await qc.invalidateQueries({ queryKey: ['me'] });
      nav('/admin');
    } catch (e) {
      setError(e.data?.error === 'bad_token' ? 'Wrong token.' : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Admin login</h1>
      <form className="panel" onSubmit={submit}>
        <label>Admin username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label>Bootstrap token</label>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} required />
        <div style={{ marginTop: 16 }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
