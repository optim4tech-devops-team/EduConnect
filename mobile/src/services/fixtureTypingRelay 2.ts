type FixtureTypingParticipant = {
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderLabel?: string;
};

const FIXTURE_TYPING_URL = process.env.EXPO_PUBLIC_FIXTURE_TYPING_URL ?? 'http://127.0.0.1:8091';

async function relayFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(`${FIXTURE_TYPING_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function startFixtureTyping(params: {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderLabel?: string;
}): Promise<void> {
  await relayFetch('/typing/start', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function stopFixtureTyping(params: {
  conversationId: string;
  senderId: string;
}): Promise<void> {
  await relayFetch('/typing/stop', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function fetchFixtureTypers(params: {
  conversationId: string;
  viewerId: string;
}): Promise<FixtureTypingParticipant[]> {
  const query = new URLSearchParams({
    conversationId: params.conversationId,
    viewerId: params.viewerId,
  });

  const payload = await relayFetch<{ typers?: FixtureTypingParticipant[] }>(
    `/typing/state?${query.toString()}`,
    { method: 'GET' },
  );

  return Array.isArray(payload?.typers) ? payload.typers : [];
}
