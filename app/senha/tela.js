'use client';
import { useState } from 'react';
import { api } from '../util';

export default function Tela() {
  const vazio = { atual: '', nova: '', repete: '' };
  const [f, setF] = useState(vazio);
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [env, setEnv] = useState(false);

  async function salvar(e) {
    e.preventDefault(); setErro(''); setMsg('');
    if (f.nova !== f.repete) { setErro('A nova senha e a confirmação não estão iguais.'); return; }
    setEnv(true);
    const r = await api('/api/senha', 'POST', { atual: f.atual, nova: f.nova });
    setEnv(false);
    if (!r.ok) { setErro(r.d.erro || 'Não foi possível trocar a senha.'); return; }
    setF(vazio);
    setMsg('Senha trocada. Use a nova senha no próximo acesso.');
  }

  const tipo = ver ? 'text' : 'password';
  return (
    <>
      <h1>Minha senha</h1>
      <form className='card' onSubmit={salvar} style={{ maxWidth: 480 }}>
        <label>Senha atual</label>
        <input type={tipo} value={f.atual} autoComplete='current-password' onChange={(e) => setF({ ...f, atual: e.target.value })} />
        <label>Nova senha</label>
        <input type={tipo} value={f.nova} autoComplete='new-password' onChange={(e) => setF({ ...f, nova: e.target.value })} />
        <label>Repita a nova senha</label>
        <input type={tipo} value={f.repete} autoComplete='new-password' onChange={(e) => setF({ ...f, repete: e.target.value })} />
        <p className='aviso'>Pelo menos 8 caracteres. Misture letras e números.</p>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', textTransform: 'none' }}><input type='checkbox' style={{ width: 'auto' }} checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar as senhas</label>
        {erro && <p className='erro'>{erro}</p>}
        {msg && <p className='ok'>{msg}</p>}
        <button className='btn' disabled={env}>{env ? 'Salvando...' : 'Trocar senha'}</button>
      </form>
    </>
  );
}
