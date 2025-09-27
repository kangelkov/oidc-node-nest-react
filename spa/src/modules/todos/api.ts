import { useAuth } from '../auth/AuthProvider';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export function useTodosApi() {
    const { fetchWithAuth } = useAuth();

    return {
        list: async () => {
            const res = await fetchWithAuth(`${API_BASE}/todos`);
            if (!res.ok) throw new Error(await res.text());
            return (await res.json()) as Array<{ id: string; title: string; completed: boolean }>;
        },
        create: async (title: string) => {
            const res = await fetchWithAuth(`${API_BASE}/todos`, { method: 'POST', body: JSON.stringify({ title }) });
            if (res.status === 400) throw new Error((await res.json()).error);
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        },
        update: async (id: string, patch: Partial<{ title: string; completed: boolean }>) => {
            const res = await fetchWithAuth(`${API_BASE}/todos/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        },
        remove: async (id: string) => {
            const res = await fetchWithAuth(`${API_BASE}/todos/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(await res.text());
        }
    };
}
