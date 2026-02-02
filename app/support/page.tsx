"use client";
import { useState } from "react";
import { Bot, ShieldCheck, MessageSquare, CheckCircle2 } from "lucide-react";

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subject, message }),
      });

      if (response.ok) {
        setSuccess(true);
        setSubject("");
        setMessage("");
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } catch (err) {
      setError("Impossible de contacter le serveur. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-panel-left">
        <div className="auth-brand">
          <div className="auth-logo">
            <Bot size={28} strokeWidth={2.5} />
          </div>
          <h1 className="auth-product-name">Workspace Helper</h1>
          <p className="auth-product-tagline">
            Contactez le support de workspace helper.
          </p>
        </div>
      </div>

      <div className="auth-panel-right">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Contacter le support</h1>
            <p className="auth-subtitle">
              Envoyez-nous un message et nous vous répondrons dans les plus brefs délais.
            </p>
          </div>

          <div className="auth-body">
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label 
                  htmlFor="subject" 
                  style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    fontSize: '0.875rem'
                  }}
                >
                  Sujet
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="Objet de votre demande"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label 
                  htmlFor="message" 
                  style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    fontSize: '0.875rem'
                  }}
                >
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  placeholder="Décrivez votre problème ou votre question..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    resize: 'vertical'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {success && (
                <div 
                  style={{ 
                    padding: '0.75rem',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>Message envoyé avec succès !</span>
                </div>
              )}

              {error && (
                <div 
                  style={{ 
                    padding: '0.75rem',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem'
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-google"
                style={{
                  backgroundColor: loading ? '#9ca3af' : undefined,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                <MessageSquare size={20} />
                <span>{loading ? "Envoi en cours..." : "Envoyer le message"}</span>
              </button>
            </form>
          </div>

          <div className="auth-footer">
            <div className="security-note">
              <ShieldCheck size={16} />
              <span>Vos données sont sécurisées</span>
            </div>
            <p className="help-text">
              Retour à l'accueil ? <a href="/">Cliquez ici</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
