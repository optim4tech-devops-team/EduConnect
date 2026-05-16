import { FormEvent, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const location = useLocation();
  const [email, setEmail] = useState('ikinci.yonetici@notio.local');
  const [password, setPassword] = useState('Admin123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reason = new URLSearchParams(location.search).get('reason');
  const reasonMessage = getReasonMessage(reason);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-orb login-orb-top" />
      <div className="login-orb login-orb-bottom" />

      <div className="login-panel">
        <section className="login-hero">
          <div className="hero-mark">
            <img src="/notio-bird-mark.png" alt="Notio" />
          </div>
          <div className="hero-copy">
            <div className="hero-title">Notio</div>
            <p className="hero-subtitle">Onun dunyasina bir pencere.</p>
            <div className="hero-chip">Okul, veli ve ogretmen akislarini ayni sistemde yonetin.</div>
          </div>
        </section>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="card-kicker">Web Admin</div>
          <h1>Yonetici girisi</h1>
          <p>Mobil yapiyi bozmadan, web icin ayrilan yeni panel buradan ilerleyecek.</p>

          <label className="field">
            <span>E-posta</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="yonetici@okul.com"
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Sifre</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {reasonMessage ? <div className="success-banner">{reasonMessage}</div> : null}
          {error ? <div className="error-banner">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={loading || !email || !password}>
            {loading ? 'Giris yapiliyor...' : 'Panele Gir'}
          </button>

          <div className="login-note">Bu ilk web iskeleti school admin verilerini backend'den cekiyor.</div>
        </form>
      </div>
    </div>
  );
}

function getReasonMessage(reason: string | null) {
  if (reason === 'network') {
    return 'Sunucu baglantisi kesildigi icin tekrar giris ekranina yonlendirildiniz.';
  }

  if (reason === 'unauthorized') {
    return 'Oturum suresi doldu. Lutfen yeniden giris yapin.';
  }

  if (reason === 'forbidden') {
    return 'Bu panele erisim yetkiniz bulunmadigi icin cikis yapildi.';
  }

  return '';
}
