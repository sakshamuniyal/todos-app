import { useEffect, useState } from 'react';
import type { Todo } from './types/types';

type Filter = 'all' | 'active' | 'completed';
const API_URL = import.meta.env.BASE_API_URL;

if (!API_URL) {
  throw new Error('BASE_API_URL is not configured');
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}?status=all`);
      if (!response.ok) throw new Error('Unable to load todos');
      const data: Todo[] = await response.json();
      setTodos(data);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load todos');
    } finally {
      setLoading(false);
    }
  };

  const createTodo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      const response = await fetch(editingId === null ? API_URL : `${API_URL}/${editingId}`, {
        method: editingId === null ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, description }),
      });
      if (!response.ok) throw new Error('Unable to save todo');
      const savedTodo: Todo = await response.json();
      setTodos((currentTodos) => editingId === null
        ? [savedTodo, ...currentTodos]
        : currentTodos.map((todo) => todo.id === savedTodo.id ? savedTodo : todo));
      
      setTitle('');
      setDescription('');
      setEditingId(null);
      setIsFormOpen(false);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save todo');
    }
  };

  const toggleCompleted = async (todo: Todo) => {
    try {
      const response = await fetch(`${API_URL}/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      });
      if (!response.ok) throw new Error('Unable to update todo');
      const updatedTodo: Todo = await response.json();
      setTodos((currentTodos) => currentTodos.map((item) => item.id === updatedTodo.id ? updatedTodo : item));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update todo');
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Unable to delete todo');
      setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to delete todo');
    }
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setTitle(todo.title);
    setDescription(todo.description ?? '');
    setIsFormOpen(true);
  };

  const startCreating = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setTitle('');
    setDescription('');
  };

  const visibleTodos = todos.filter((todo) =>
    filter === 'all' || (filter === 'completed' ? todo.completed : !todo.completed),
  );

  return (
    <div id="todo-app" className="todo-app">
      <header className="todo-app__header">
        <h1 className="todo-app__title">Todo List</h1>
        <button className="todo-app__add-button" type="button" onClick={startCreating} aria-label="Add todo" title="Add todo">+</button>
      </header>

      {isFormOpen && <div className="todo-modal" role="dialog" aria-modal="true" aria-labelledby="todo-form-title">
        <div className="todo-modal__content">
          <div className="todo-modal__header">
            <h2 id="todo-form-title">{editingId === null ? 'Add Todo' : 'Edit Todo'}</h2>
            <button className="todo-modal__close" type="button" onClick={closeForm} aria-label="Close form" title="Close form">×</button>
          </div>
          <form className="todo-form" onSubmit={createTodo}>
            <input
              className="todo-form__title-input"
              type="text"
              placeholder="Todo Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
            <textarea
              className="todo-form__description-input"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="todo-form__actions">
              <button className="todo-form__submit" type="submit">{editingId === null ? 'Add Todo' : 'Save Todo'}</button>
              <button className="todo-form__cancel" type="button" onClick={closeForm}>Cancel</button>
            </div>
          </form>
        </div>
      </div>}

      {error && <p className="todo-app__error" role="alert">{error}</p>}
      <nav className="todo-filters" aria-label="Todo filters">
        {(['active', 'completed', 'all'] as Filter[]).map((value) => (
          <button
            className={`todo-filters__button${filter === value ? ' is-active' : ''}`}
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </nav>

      {loading ? <p className="todo-app__loading">Loading...</p> : <ul className="todo-list">
        {visibleTodos.map((todo: Todo) => (
          <li className="todo-list__item" key={todo.id}>
            <div className="todo-list__header">
              <span className={`todo-list__status${todo.completed ? ' todo-list__status--completed' : ''}`}>
                {todo.completed ? 'Completed' : 'Open'}
              </span>
              <h2 className={`todo-list__title${todo.completed ? ' todo-list__title--completed' : ''}`}>{todo.title}</h2>
            </div>
            <p className="todo-list__description">{todo.description || 'No description'}</p>
            <p className="todo-list__created-at">Created At: {todo.createdAt ? new Date(todo.createdAt).toLocaleString() : 'N/A'}</p>
            <div className="todo-list__actions">
              <button className="todo-list__complete-button" type="button" onClick={() => toggleCompleted(todo)} aria-label={todo.completed ? 'Mark todo as open' : 'Mark todo as completed'} title={todo.completed ? 'Mark as open' : 'Mark as completed'}>{todo.completed ? '✘' : '✔'}</button>
              <button className="todo-list__edit-button" type="button" onClick={() => startEditing(todo)} aria-label="Edit todo" title="Edit todo">✏️</button>
              <button className="todo-list__delete-button" type="button" onClick={() => deleteTodo(todo.id)} aria-label="Delete todo" title="Delete todo">❌</button>
            </div>
          </li>
        ))}
      </ul>}
    </div>
  );
}

export default App;
