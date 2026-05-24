/**
 * ModalConfiguracoes.jsx
 *
 * Modal de configurações do Fluxo.
 * Acessível via ModalPerfil → botão "Configurações".
 * Preferências persistidas no campo 'configuracoes' (JSONB) da tabela 'perfis' no Supabase.
 */

import React, { useState } from 'react';
import { X, Moon, Sun, Bell, Sparkles, Trash2, Download } from 'lucide-react';

// ── Toggle estilo iOS ────────────────────────────────────────────────────────
function Toggle({ ativo, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!ativo)}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200 focus:outline-none"
      style={{ background: ativo ? '#f59e0b' : 'rgba(255,255,255,0.12)' }}
    >
      <div
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: ativo ? 'translateX(21px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

// ── Linha de configuração ────────────────────────────────────────────────────
function ConfigRow({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between py-3.5 gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-200 leading-tight">{label}</p>
        {desc && <p className="text-[11px] text-zinc-600 mt-0.5 leading-snug">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Separador de seção ───────────────────────────────────────────────────────
function Secao({ titulo, icon: Icon, children }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 px-5 py-3">
        {Icon && <Icon size={13} className="text-zinc-600 flex-shrink-0" />}
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">{titulo}</p>
      </div>
      <div
        className="mx-4 rounded-xl px-4 divide-y"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          divideColor: 'rgba(255,255,255,0.05)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Modal principal ──────────────────────────────────────────────────────────
export default function ModalConfiguracoes({ config: configInicial, onSalvar, onFechar, onLimparMemoria }) {
  const [form, setForm] = useState({
    tema: configInicial?.tema || 'escuro',
    notificacoes: {
      lembretes: configInicial?.notificacoes?.lembretes ?? true,
      checkin:   configInicial?.notificacoes?.checkin   ?? true,
      streak:    configInicial?.notificacoes?.streak    ?? true,
    },
    tomFlora: configInicial?.tomFlora || 'calorosa',
  });

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));
  const setNotif = (campo, valor) => setForm(f => ({
    ...f,
    notificacoes: { ...f.notificacoes, [campo]: valor },
  }));

  const handleSalvar = () => {
    onSalvar(form);
    onFechar();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onFechar}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: '#15151e',
          border: '1px solid rgba(255,255,255,0.07)',
          maxHeight: '90dvh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h2 className="font-titulo font-bold text-white text-base">Configurações</h2>
            <p className="text-[11px] text-zinc-600 mt-0.5">Preferências sincronizadas entre dispositivos</p>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="overflow-y-auto flex-1 py-2">

          {/* ── Aparência ───────────────────────────────────────────────── */}
          <Secao titulo="Aparência" icon={Moon}>
            <ConfigRow
              label="Tema"
              desc="Claro ainda em desenvolvimento — estrutura ativa"
            >
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => set('tema', 'escuro')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: form.tema === 'escuro' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                    border: form.tema === 'escuro' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    color: form.tema === 'escuro' ? '#f59e0b' : '#71717a',
                  }}
                >
                  <Moon size={10} /> Escuro
                </button>
                <button
                  onClick={() => set('tema', 'claro')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: form.tema === 'claro' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                    border: form.tema === 'claro' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    color: form.tema === 'claro' ? '#f59e0b' : '#71717a',
                  }}
                >
                  <Sun size={10} /> Claro
                </button>
              </div>
            </ConfigRow>
          </Secao>

          {/* ── Notificações ────────────────────────────────────────────── */}
          <Secao titulo="Notificações" icon={Bell}>
            <ConfigRow
              label="Lembretes de compromissos"
              desc="30 minutos antes do horário"
            >
              <Toggle ativo={form.notificacoes.lembretes} onChange={v => setNotif('lembretes', v)} />
            </ConfigRow>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <ConfigRow
                label="Check-in noturno"
                desc="Lembrete às 20h para fechar o dia"
              >
                <Toggle ativo={form.notificacoes.checkin} onChange={v => setNotif('checkin', v)} />
              </ConfigRow>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <ConfigRow
                label="Streak em risco"
                desc="Aviso às 21h quando a sequência pode ser perdida"
              >
                <Toggle ativo={form.notificacoes.streak} onChange={v => setNotif('streak', v)} />
              </ConfigRow>
            </div>
          </Secao>

          {/* ── Flora ───────────────────────────────────────────────────── */}
          <Secao titulo="Flora" icon={Sparkles}>
            <ConfigRow
              label="Tom da Flora"
              desc="Como ela fala com você"
            >
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => set('tomFlora', 'calorosa')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: form.tomFlora === 'calorosa' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                    border: form.tomFlora === 'calorosa' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    color: form.tomFlora === 'calorosa' ? '#f59e0b' : '#71717a',
                  }}
                >
                  Calorosa
                </button>
                <button
                  onClick={() => set('tomFlora', 'direta')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: form.tomFlora === 'direta' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                    border: form.tomFlora === 'direta' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    color: form.tomFlora === 'direta' ? '#f59e0b' : '#71717a',
                  }}
                >
                  Direta
                </button>
              </div>
            </ConfigRow>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} className="pb-1">
              <p className="text-[11px] text-zinc-600 pt-2 pb-1 leading-relaxed">
                {form.tomFlora === 'calorosa'
                  ? '💛 Calorosa — próxima e acolhedora, com empatia e encorajamento.'
                  : '⚡ Direta — objetiva e sem rodeios, foco total no que fazer.'}
              </p>
            </div>
          </Secao>

          {/* ── Privacidade ─────────────────────────────────────────────── */}
          <Secao titulo="Privacidade" icon={Trash2}>
            <ConfigRow
              label="Limpar memória da Flora"
              desc="Remove o que ela aprendeu sobre você"
            >
              <button
                onClick={onLimparMemoria}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171',
                }}
              >
                Limpar
              </button>
            </ConfigRow>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <ConfigRow
                label="Exportar dados"
                desc="Baixar todos os seus dados"
              >
                <button
                  disabled
                  className="flex items-center gap-1 flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold opacity-30 cursor-not-allowed"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#71717a',
                  }}
                >
                  <Download size={10} /> Em breve
                </button>
              </ConfigRow>
            </div>
          </Secao>

        </div>

        {/* Botão salvar */}
        <div
          className="px-4 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={handleSalvar}
            className="w-full py-3 rounded-xl text-sm font-semibold font-titulo transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#000',
            }}
          >
            Salvar preferências
          </button>
        </div>
      </div>
    </div>
  );
}
