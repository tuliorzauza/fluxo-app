import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabase';

export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f13] px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          >
            <span className="text-3xl font-bold text-amber-500 font-titulo">F</span>
          </div>
          <h1 className="text-2xl font-bold text-white font-titulo">Fluxo</h1>
          <p className="text-zinc-500 text-sm mt-1">com a Flora</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#f59e0b',
                  brandAccent: '#d97706',
                  defaultButtonBackground: '#1a1a24',
                  defaultButtonBackgroundHover: '#222230',
                  inputBackground: '#1a1a24',
                  inputBorder: 'rgba(255,255,255,0.08)',
                  inputBorderHover: 'rgba(245,158,11,0.3)',
                  inputText: '#ffffff',
                  inputPlaceholder: '#52525b',
                },
                borderWidths: {
                  buttonBorderWidth: '1px',
                  inputBorderWidth: '1px',
                },
                radii: {
                  borderRadiusButton: '12px',
                  buttonBorderRadius: '12px',
                  inputBorderRadius: '12px',
                },
              },
            },
          }}
          providers={['google']}
          onlyThirdPartyProviders={true}
          redirectTo={
            typeof window !== 'undefined'
              ? `${window.location.origin}/`
              : 'https://fluxo-app-zeta.vercel.app/'
          }
          queryParams={{
            prompt: 'select_account',
            access_type: 'offline',
          }}
          localization={{
            variables: {
              sign_in: {
                social_provider_text: 'Entrar com {{provider}}',
              },
            },
          }}
        />

        <p className="text-zinc-600 text-xs text-center mt-6">
          Ao entrar, você concorda com os termos de uso do Fluxo.
        </p>
      </div>
    </div>
  );
}
