import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/token-storage';
import { HttpError, httpClient, setUnauthorizedHandler } from '@/services/http';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function sentHeaders(fetchMock: ReturnType<typeof stubFetch>): Headers {
  return new Headers(fetchMock.mock.calls[0][1]?.headers);
}

afterEach(() => setUnauthorizedHandler(() => {}));

describe('httpClient', () => {
  it('usa a URL de VITE_API_URL e envia o Bearer quando há token', async () => {
    tokenStorage.set('token-de-teste');
    const fetchMock = stubFetch(jsonResponse([]));

    await httpClient.get('/api/transactions');

    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/transactions');
    expect(sentHeaders(fetchMock).get('Authorization')).toBe('Bearer token-de-teste');
  });

  it('não envia Authorization sem token nem Content-Type sem corpo', async () => {
    const fetchMock = stubFetch(jsonResponse([]));

    await httpClient.get('/api/transactions');

    const headers = sentHeaders(fetchMock);
    expect(headers.has('Authorization')).toBe(false);
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('envia o Bearer em /auth/me e encerra a sessão se ele responder 401', async () => {
    tokenStorage.set('token-de-teste');
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    const fetchMock = stubFetch(new Response(null, { status: 401 }));

    await expect(httpClient.get('/auth/me')).rejects.toMatchObject({ status: 401 });

    expect(sentHeaders(fetchMock).get('Authorization')).toBe('Bearer token-de-teste');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('não envia o token no cadastro', async () => {
    tokenStorage.set('token-de-teste');
    const fetchMock = stubFetch(jsonResponse({ id: 1 }, 201));

    await httpClient.post('/auth/cadastrar', { nome: 'a', email: 'a@b.c', senha: 'x' });

    expect(sentHeaders(fetchMock).has('Authorization')).toBe(false);
  });

  it('não envia o token no login', async () => {
    tokenStorage.set('token-de-teste');
    const fetchMock = stubFetch(jsonResponse({ token: 'novo' }));

    await httpClient.post('/auth/login', { email: 'a@b.c', senha: 'x' });

    expect(sentHeaders(fetchMock).has('Authorization')).toBe(false);
  });

  it('mantém o Content-Type JSON quando o chamador passa headers próprios', async () => {
    const fetchMock = stubFetch(jsonResponse({ id: 1 }, 201));

    await httpClient.post('/api/transactions', { quantity: 1 }, { headers: { 'X-Extra': '1' } });

    const headers = sentHeaders(fetchMock);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Extra')).toBe('1');
    expect(fetchMock.mock.calls[0][1]?.body).toBe('{"quantity":1}');
  });

  it('resolve com undefined em resposta 204', async () => {
    stubFetch(new Response(null, { status: 204 }));

    await expect(httpClient.delete('/api/transactions/1')).resolves.toBeUndefined();
  });

  it('em 401 chama o handler de sessão e lança HttpError', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    stubFetch(new Response(null, { status: 401 }));

    await expect(httpClient.get('/api/transactions')).rejects.toMatchObject({ name: 'HttpError', status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('não encerra a sessão por um 401 do próprio login', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    stubFetch(new Response(null, { status: 401 }));

    await expect(httpClient.post('/auth/login', {})).rejects.toBeInstanceOf(HttpError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('carrega o corpo do erro 400 para a tela poder mostrar os campos inválidos', async () => {
    const body = [{ campo: 'email', mensagem: 'E-mail inválido' }];
    stubFetch(jsonResponse(body, 400));

    await expect(httpClient.post('/auth/cadastrar', {})).rejects.toMatchObject({ status: 400, body });
  });

  it('traduz falha de rede em HttpError com status 0', async () => {
    stubFetch(new TypeError('Failed to fetch'));

    await expect(httpClient.get('/api/transactions')).rejects.toMatchObject({ name: 'HttpError', status: 0 });
  });
});
