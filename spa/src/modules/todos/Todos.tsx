import React, { useEffect, useState } from 'react';
import { useTodosApi } from './api';
import { useAuth } from '../auth/AuthProvider';

type Todo = { id: string; title: string; completed: boolean };

export const Todos: React.FC = () => {
    const api = useTodosApi();
    const { roles, logout } = useAuth();

    const [todos, setTodos] = useState<Todo[]>([]);
    const [title, setTitle] = useState('');
    const [error, setError] = useState<string | null>(null);
    const canWrite = roles.includes('write');

    const refresh = async () => {
        try {
            setError(null);
            const list = await api.list();
            setTodos(list);
        } catch (e: any) {
            setError('Unauthorized or API unavailable!! Try logging in again.');
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.create(title.trim());
            setTitle('');
            await refresh();
        } catch (e: any) {
            setError(e.message || 'Failed to create');
        }
    };

    const onToggle = async (t: Todo) => {
        try {
            await api.update(t.id, { completed: !t.completed });
            await refresh();
        } catch (e: any) {
            setError(e.message || 'Failed to update');
        }
    };

    const onDelete = async (t: Todo) => {
        try {
            await api.remove(t.id);
            await refresh();
        } catch (e: any) {
            setError(e.message || 'Failed to delete');
        }
    };

    return (
        <div style={{ padding: 24, maxWidth: 800 }}>
            <h2>Todos</h2>

            {error && <div style={{ background: '#fee', padding: 12, marginBottom: 12 }}>{error}</div>}

            {!canWrite && <p><i>You have read-only access. (role: read)</i></p>}

            <form onSubmit={onCreate} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                    value={title}
                    placeholder="Buy milk"
                    onChange={e => setTitle(e.target.value)}
                    disabled={!canWrite}
                    style={{ flex: 1, padding: 8 }}
                />
                <button disabled={!canWrite || !title.trim()} type="submit">Add</button>
            </form>

            <ul style={{ listStyle: 'none', padding: 0 }}>
                {todos.map(t => (
                    <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                        <input type="checkbox" checked={t.completed} onChange={() => onToggle(t)} disabled={!canWrite} />
                        <span style={{ textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
                        {canWrite && (
                            <button onClick={() => onDelete(t)} style={{ marginLeft: 'auto' }}>
                                Delete
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            <div style={{ marginTop: 24 }}>
                <button onClick={() => logout()}>Logout</button>
            </div>
        </div>
    );
};
