import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureCloud, getCloudSession } from '../src/cloud/cloudClient.js';
import { readJSONForProfile, setActiveProfile, writeJSONForProfile } from '../src/utils/storage.js';

// Hallazgo LOCAL-04 de la auditoría: si se cambiaba de cuenta mientras se
// renovaba el token, la respuesta se guardaba en la cuenta nueva y esa cuenta
// quedaba usando la identidad de la anterior en la nube.
test('renovar el token de una cuenta no lo guarda en otra si se cambia de perfil a mitad de camino', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  configureCloud({
    url: 'https://demo.supabase.co', key: 'sb_publishable_demo',
    fetch: async url => {
      assert.match(url, /grant_type=refresh_token/);
      await gate;
      return new Response(JSON.stringify({ access_token: 'token-de-A', refresh_token: 'ref-A2', expires_in: 3600, user: { id: 'cloud-A' } }), { status: 200 });
    },
  });
  writeJSONForProfile('perfil-A', 'guarania:cloudSession', { accessToken: 'vencido', refreshToken: 'ref-A', expiresAt: 0, userId: 'cloud-A' });
  writeJSONForProfile('perfil-B', 'guarania:cloudSession', { accessToken: 'token-de-B', refreshToken: 'ref-B', expiresAt: Math.floor(Date.now() / 1000) + 3600, userId: 'cloud-B' });

  setActiveProfile('perfil-A');
  const pending = getCloudSession();
  setActiveProfile('perfil-B'); // cambio de cuenta mientras se renueva
  release();
  const session = await pending;

  assert.equal(session.userId, 'cloud-A');
  assert.equal(readJSONForProfile('perfil-A', 'guarania:cloudSession', null).accessToken, 'token-de-A');
  assert.equal(readJSONForProfile('perfil-B', 'guarania:cloudSession', null).userId, 'cloud-B', 'la cuenta B conserva su propia identidad');
  setActiveProfile(null);
});
