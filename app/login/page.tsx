"use client";
import { signIn } from "next-auth/react";
import { Bot, ShieldCheck, Sparkles, CheckCircle2, MessageSquare, Zap } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="auth-wrapper">
      <div className="auth-panel-left">
        <div className="auth-brand">
          <div className="auth-logo">
            <Bot size={28} strokeWidth={2.5} />
          </div>
          <h1 className="auth-product-name">Google Workspace Helper</h1>
          <p className="auth-product-tagline">
            Votre assistant expert Google Workspace, par Numericoach.
          </p>
          <ul className="auth-features">
            <li>
              <CheckCircle2 size={20} />
              <span>Conseils et astuces sur Google Workspace</span>
            </li>
            <li>
              <MessageSquare size={20} />
              <span>Réponses structurées et bonnes pratiques</span>
            </li>
            <li>
              <Zap size={20} />
              <span>Propulsé par l’IA Gemini, rapide et fiable</span>
            </li>
            <li>
              <ShieldCheck size={20} />
              <span>Connexion sécurisée avec votre compte Google</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="auth-panel-right">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Connexion</h1>
            <p className="auth-subtitle">
              Connectez-vous avec votre compte Google pour accéder à votre assistant{" "}
              <span className="highlight">Workspace</span>.
            </p>
          </div>

          <div className="auth-body">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="btn-google"
            >
              <svg className="google-svg" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continuer avec Google</span>
            </button>
          </div>

          <div className="auth-footer">
            <div className="security-note">
              <ShieldCheck size={16} />
              <span>Connexion sécurisée via Google OAuth</span>
            </div>
            <p className="help-text">
              Besoin d'aide ? <a href="/support">Contacter le support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
