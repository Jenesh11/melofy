import type { LavalinkNode } from 'lavalink-client';

/** The client's search() rewrites custom ytrec prefixes. Use its authenticated REST transport. */
export function nodeLinkDiscoveryLoader(getNode: () => Pick<LavalinkNode, 'connected' | 'rawRequest'> | undefined) {
  return async (identifier: string, signal: AbortSignal): Promise<unknown> => {
    const node = getNode();
    if (!node?.connected) throw new Error('No NodeLink nodes available');
    const { response } = await node.rawRequest(`/loadtracks?identifier=${encodeURIComponent(identifier)}`, options => { options.signal = signal; });
    if (!response.ok) throw new Error('NodeLink discovery unavailable');
    return response.json();
  };
}
